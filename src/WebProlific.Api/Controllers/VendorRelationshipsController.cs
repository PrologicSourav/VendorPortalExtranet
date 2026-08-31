using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebProlific.Api.Extensions;
using WebProlific.Core.Entities;
using WebProlific.Core.Interfaces;

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

    public VendorRelationshipsController(
        IVendorRelationshipRepository relationshipRepo, IVendorRepository vendorRepo, IAuditLogRepository auditLog)
    {
        _relationshipRepo = relationshipRepo;
        _vendorRepo = vendorRepo;
        _auditLog = auditLog;
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

        if (existing is not null)
        {
            existing.Status = VendorRelationshipStatus.Active;
            existing.ScopeType = scope;
            existing.EndDate = null;
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
