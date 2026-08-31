using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebProlific.Api.Extensions;
using WebProlific.Core.Entities;
using WebProlific.Core.Interfaces;
using WebProlific.Infrastructure.Data;
using WebProlific.Infrastructure.WishIntegration;

namespace WebProlific.Api.Controllers;

/// <summary>
/// Manages which Chains/Properties a vendor is actually approved to transact
/// with (Flow A/B/D from the vendor-portal access redesign — attaching an
/// existing vendor to a new chain/property, or creating a brand new one).
/// This is deliberately separate from KYC: KYC verifies the vendor's legal
/// identity once, globally; a VendorRelationship says where they're allowed
/// to operate once that identity is verified.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class VendorRelationshipsController : ControllerBase
{
    private readonly IVendorRelationshipRepository _relationshipRepo;
    private readonly IVendorRepository _vendorRepo;
    private readonly IAuditLogRepository _auditLog;
    private readonly AppDbContext _db;
    private readonly WishPurchaseOrderReader _wishReader;

    public VendorRelationshipsController(
        IVendorRelationshipRepository relationshipRepo, IVendorRepository vendorRepo, IAuditLogRepository auditLog,
        AppDbContext db, WishPurchaseOrderReader wishReader)
    {
        _relationshipRepo = relationshipRepo;
        _vendorRepo = vendorRepo;
        _auditLog = auditLog;
        _db = db;
        _wishReader = wishReader;
    }

    /// <summary>WISH vendor records (vendor_id/property_id, property-scoped) that
    /// no VendorRelationship.ExternalVendorId (or the older Vendor.WishVendorId)
    /// points at yet — the governance "Unmapped Vendors" queue. Property/chain
    /// names, and the local ids needed to actually create a relationship, are
    /// only resolved when that WISH property has already been synced
    /// (Property.WishPropertyId) — an unsynced property still shows up so staff
    /// know it exists, just without a "Map" action until the chain/property sync
    /// catches up to it.</summary>
    [HttpGet("unmapped")]
    [Authorize(Policy = "InternalOnly")]
    public async Task<IActionResult> GetUnmapped([FromQuery] string? search)
    {
        if (!_wishReader.IsConfigured)
            return Ok(new { configured = false, items = Array.Empty<object>() });

        var wishVendors = await _wishReader.GetAllVendorsAsync();

        var alreadyMapped = (await _db.VendorRelationships
                .Where(r => r.ExternalVendorId != null && r.ExternalVendorId != "")
                .Select(r => r.ExternalVendorId!)
                .ToListAsync())
            .Concat(await _db.Vendors
                .Where(v => v.WishVendorId != null && v.WishVendorId != "")
                .Select(v => v.WishVendorId!)
                .ToListAsync())
            .Select(id => id.Trim())
            .ToHashSet();

        var properties = await _db.Properties
            .Include(p => p.BuyingEntity)
            .Where(p => p.WishPropertyId != null && p.WishPropertyId != "" && p.IsActive)
            .ToListAsync();
        // GroupBy+First rather than a raw ToDictionary — WISH's own vo_property
        // table repeats property_id across rows (see WishBuyingEntitySyncService),
        // so a duplicate key here is expected data, not a bug to crash on.
        var propertyByWishId = properties
            .GroupBy(p => p.WishPropertyId!)
            .ToDictionary(g => g.Key, g => g.First());

        var unmapped = wishVendors.Where(v => !alreadyMapped.Contains(v.VendorId));
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            unmapped = unmapped.Where(v =>
                v.VendorName.Contains(s, StringComparison.OrdinalIgnoreCase) ||
                v.VendorId.Contains(s, StringComparison.OrdinalIgnoreCase));
        }

        var unmappedList = unmapped.OrderBy(v => v.VendorName).ToList();
        var result = unmappedList
            .Take(500) // capped so a huge unsynced WISH vendor table can't return an unbounded payload — totalCount below tells the UI when more exist so it's never a silent truncation
            .Select(v =>
            {
                propertyByWishId.TryGetValue(v.PropertyId, out var property);
                return new
                {
                    v.VendorId,
                    v.VendorName,
                    WishPropertyId = v.PropertyId,
                    v.Gstin,
                    v.Pan,
                    PropertyName = property?.Name,
                    BuyingEntityName = property?.BuyingEntity?.Name,
                    PropertyId = property?.Id,
                    BuyingEntityId = property?.BuyingEntityId,
                    Resolved = property is not null,
                };
            })
            .ToList();

        return Ok(new { configured = true, items = result, totalCount = unmappedList.Count });
    }

    [HttpGet("vendor/{vendorId:guid}")]
    public async Task<IActionResult> GetByVendor(Guid vendorId)
    {
        if (!User.CanAccessVendor(vendorId)) return Forbid();

        var relationships = await _relationshipRepo.GetByVendorAsync(vendorId);
        var items = relationships.Select(r => new
        {
            r.Id,
            r.BuyingEntityId,
            BuyingEntityName = r.BuyingEntity.Name,
            r.PropertyId,
            PropertyName = r.Property?.Name,
            ScopeType = r.ScopeType.ToString(),
            Status = r.Status.ToString(),
            r.ExternalVendorId,
            r.StartDate,
            r.EndDate,
        });
        return Ok(items);
    }

    public class CreateRelationshipRequest
    {
        public Guid VendorId { get; set; }
        public Guid BuyingEntityId { get; set; }
        public Guid? PropertyId { get; set; }
        public string ScopeType { get; set; } = "Property";
        /// <summary>WISH's own vendor_id for this specific chain/property, when
        /// known (e.g. confirming a match from the Unmapped Vendors screen).
        /// Optional — a relationship can exist before its WISH id is known.</summary>
        public string? ExternalVendorId { get; set; }
    }

    /// <summary>Attach a vendor (existing or just-created) to a chain/property.
    /// Never creates a second Vendor record — always operates on the given
    /// VendorId. Reactivates a matching Inactive relationship instead of
    /// creating a duplicate row.</summary>
    [HttpPost]
    [Authorize(Policy = "InternalOnly")]
    public async Task<IActionResult> Create([FromBody] CreateRelationshipRequest request)
    {
        var vendor = await _vendorRepo.GetByIdAsync(request.VendorId);
        if (vendor is null) return NotFound(new { error = "Vendor not found" });

        if (!Enum.TryParse<VendorRelationshipScope>(request.ScopeType, true, out var scope))
            return BadRequest(new { error = "ScopeType must be Chain or Property" });

        if (scope == VendorRelationshipScope.Property && request.PropertyId is null)
            return BadRequest(new { error = "PropertyId is required for a Property-scoped relationship" });

        var propertyId = scope == VendorRelationshipScope.Chain ? null : request.PropertyId;

        var existing = (await _relationshipRepo.GetByVendorAsync(request.VendorId))
            .FirstOrDefault(r => r.BuyingEntityId == request.BuyingEntityId && r.PropertyId == propertyId);

        var externalVendorId = string.IsNullOrWhiteSpace(request.ExternalVendorId) ? null : request.ExternalVendorId.Trim();

        if (existing is not null)
        {
            existing.Status = VendorRelationshipStatus.Active;
            existing.ScopeType = scope;
            existing.EndDate = null;
            if (externalVendorId is not null) existing.ExternalVendorId = externalVendorId;
            existing.ModifiedByUserId = User.GetUserId();
            await _relationshipRepo.UpdateAsync(existing);
            await _auditLog.LogAsync("VendorRelationshipReactivated", request.VendorId, User.GetUserId(),
                $"BuyingEntityId={request.BuyingEntityId}, PropertyId={propertyId}");
            return Ok(existing);
        }

        var relationship = new VendorRelationship
        {
            Id = Guid.NewGuid(),
            VendorId = request.VendorId,
            BuyingEntityId = request.BuyingEntityId,
            PropertyId = propertyId,
            ScopeType = scope,
            ExternalVendorId = externalVendorId,
            Status = VendorRelationshipStatus.Active,
            StartDate = DateTime.UtcNow,
            CreatedByUserId = User.GetUserId(),
        };
        var created = await _relationshipRepo.CreateAsync(relationship);
        await _auditLog.LogAsync("VendorRelationshipCreated", request.VendorId, User.GetUserId(),
            $"BuyingEntityId={request.BuyingEntityId}, PropertyId={propertyId}, ScopeType={scope}");
        return CreatedAtAction(nameof(GetByVendor), new { vendorId = request.VendorId }, created);
    }

    public class SetStatusRequest { public string Status { get; set; } = string.Empty; }

    [HttpPut("{id:guid}/status")]
    [Authorize(Policy = "InternalOnly")]
    public async Task<IActionResult> SetStatus(Guid id, [FromBody] SetStatusRequest request)
    {
        var relationship = await _relationshipRepo.GetByIdAsync(id);
        if (relationship is null) return NotFound();

        if (!Enum.TryParse<VendorRelationshipStatus>(request.Status, true, out var status))
            return BadRequest(new { error = "Status must be Active or Inactive" });

        relationship.Status = status;
        relationship.EndDate = status == VendorRelationshipStatus.Inactive ? DateTime.UtcNow : null;
        relationship.ModifiedByUserId = User.GetUserId();
        await _relationshipRepo.UpdateAsync(relationship);

        await _auditLog.LogAsync(
            status == VendorRelationshipStatus.Active ? "VendorRelationshipActivated" : "VendorRelationshipRevoked",
            relationship.VendorId, User.GetUserId(), $"RelationshipId={id}");

        return Ok(relationship);
    }
}
