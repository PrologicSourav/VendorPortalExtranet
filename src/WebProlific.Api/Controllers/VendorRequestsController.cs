using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebProlific.Api.Extensions;
using WebProlific.Core.Entities;
using WebProlific.Core.Interfaces;
using WebProlific.Infrastructure.Data;

namespace WebProlific.Api.Controllers;

/// <summary>
/// Flow C — an already-onboarded vendor asking for access to another chain or
/// property it doesn't yet have an active VendorRelationship with. Approval
/// creates the relationship; a vendor never gets access merely by requesting it.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class VendorRequestsController : ControllerBase
{
    private readonly IVendorRequestRepository _requestRepo;
    private readonly IVendorRelationshipRepository _relationshipRepo;
    private readonly IAuditLogRepository _auditLog;
    private readonly AppDbContext _db;

    public VendorRequestsController(
        IVendorRequestRepository requestRepo, IVendorRelationshipRepository relationshipRepo, IAuditLogRepository auditLog,
        AppDbContext db)
    {
        _db = db;
        _requestRepo = requestRepo;
        _relationshipRepo = relationshipRepo;
        _auditLog = auditLog;
    }

    public class CreateRequestBody
    {
        public Guid VendorId { get; set; }
        public Guid RequestedBuyingEntityId { get; set; }
        public Guid? RequestedPropertyId { get; set; }
        public string RequestType { get; set; } = "Property";
        public string? Remarks { get; set; }
    }

    /// <summary>A vendor user submits a request for their own vendor. Internal
    /// staff can also file one on a vendor's behalf (e.g. Flow D).</summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateRequestBody body)
    {
        if (!User.CanAccessVendor(body.VendorId)) return Forbid();

        if (!Enum.TryParse<VendorRelationshipScope>(body.RequestType, true, out var scope))
            return BadRequest(new { error = "RequestType must be Chain or Property" });

        if (scope == VendorRelationshipScope.Property && body.RequestedPropertyId is null)
            return BadRequest(new { error = "RequestedPropertyId is required for a Property-scoped request" });

        var propertyId = scope == VendorRelationshipScope.Chain ? null : body.RequestedPropertyId;

        if (await _relationshipRepo.HasActiveAccessAsync(body.VendorId, body.RequestedBuyingEntityId, propertyId))
            return Conflict(new { error = "This vendor already has active access to that scope." });

        var request = new VendorRequest
        {
            Id = Guid.NewGuid(),
            VendorId = body.VendorId,
            RequestedBuyingEntityId = body.RequestedBuyingEntityId,
            RequestedPropertyId = propertyId,
            RequestType = scope,
            Status = VendorRequestStatus.Pending,
            RequestedByUserId = User.GetUserId() ?? Guid.Empty,
            RequestedDate = DateTime.UtcNow,
            Remarks = body.Remarks,
        };
        var created = await _requestRepo.CreateAsync(request);
        await _auditLog.LogAsync("VendorAccessRequested", body.VendorId, User.GetUserId(),
            $"BuyingEntityId={body.RequestedBuyingEntityId}, PropertyId={propertyId}, ScopeType={scope}");
        return CreatedAtAction(nameof(GetByVendor), new { vendorId = body.VendorId }, created);
    }

    [HttpGet("vendor/{vendorId:guid}")]
    public async Task<IActionResult> GetByVendor(Guid vendorId)
    {
        if (!User.CanAccessVendor(vendorId)) return Forbid();

        var requests = await _requestRepo.GetByVendorAsync(vendorId);
        return Ok(requests.Select(Project));
    }

    /// <summary>Pending-by-default approval queue for internal staff.</summary>
    [HttpGet]
    [Authorize(Policy = "InternalOnly")]
    public async Task<IActionResult> GetQueue([FromQuery] string? status)
    {
        VendorRequestStatus? parsed = null;
        if (!string.IsNullOrEmpty(status) && Enum.TryParse<VendorRequestStatus>(status, true, out var s)) parsed = s;

        var requests = await _requestRepo.GetQueueAsync(parsed);

        // Narrow to a single property when this governance session was launched
        // scoped to one (see GovernancePropertyMiddleware): a property approver
        // sees requests aimed directly at their property, plus chain-wide
        // requests that would grant access to it too — never requests for an
        // unrelated property/chain.
        var scopedPropertyId = HttpContext.GetGovernancePropertyId();
        if (scopedPropertyId.HasValue)
        {
            var scopedBuyingEntityId = await _db.Properties
                .Where(p => p.Id == scopedPropertyId.Value)
                .Select(p => (Guid?)p.BuyingEntityId)
                .FirstOrDefaultAsync();

            requests = requests.Where(r =>
                r.RequestedPropertyId == scopedPropertyId.Value ||
                (r.RequestType == VendorRelationshipScope.Chain && r.RequestedBuyingEntityId == scopedBuyingEntityId));
        }

        return Ok(requests.Select(r => new
        {
            r.Id,
            r.VendorId,
            VendorName = r.Vendor.LegalName,
            r.RequestedBuyingEntityId,
            BuyingEntityName = r.RequestedBuyingEntity.Name,
            r.RequestedPropertyId,
            PropertyName = r.RequestedProperty?.Name,
            RequestType = r.RequestType.ToString(),
            Status = r.Status.ToString(),
            r.RequestedDate,
            r.Remarks,
        }));
    }

    public class DecisionBody { public string? Remarks { get; set; } }

    [HttpPut("{id:guid}/approve")]
    [Authorize(Policy = "InternalOnly")]
    public async Task<IActionResult> Approve(Guid id, [FromBody] DecisionBody? body)
    {
        var request = await _requestRepo.GetByIdAsync(id);
        if (request is null) return NotFound();
        if (request.Status != VendorRequestStatus.Pending)
            return Conflict(new { error = $"Request is already {request.Status}." });

        var existing = (await _relationshipRepo.GetByVendorAsync(request.VendorId))
            .FirstOrDefault(r => r.BuyingEntityId == request.RequestedBuyingEntityId && r.PropertyId == request.RequestedPropertyId);

        if (existing is not null)
        {
            existing.Status = VendorRelationshipStatus.Active;
            existing.EndDate = null;
            existing.ModifiedByUserId = User.GetUserId();
            await _relationshipRepo.UpdateAsync(existing);
        }
        else
        {
            await _relationshipRepo.CreateAsync(new VendorRelationship
            {
                Id = Guid.NewGuid(),
                VendorId = request.VendorId,
                BuyingEntityId = request.RequestedBuyingEntityId,
                PropertyId = request.RequestedPropertyId,
                ScopeType = request.RequestType,
                Status = VendorRelationshipStatus.Active,
                StartDate = DateTime.UtcNow,
                CreatedByUserId = User.GetUserId(),
            });
        }

        request.Status = VendorRequestStatus.Approved;
        request.ReviewedByUserId = User.GetUserId();
        request.ReviewedDate = DateTime.UtcNow;
        request.Remarks = body?.Remarks ?? request.Remarks;
        await _requestRepo.UpdateAsync(request);

        await _auditLog.LogAsync("VendorAccessApproved", request.VendorId, User.GetUserId(), $"RequestId={id}");
        return Ok(request);
    }

    [HttpPut("{id:guid}/reject")]
    [Authorize(Policy = "InternalOnly")]
    public async Task<IActionResult> Reject(Guid id, [FromBody] DecisionBody? body)
    {
        var request = await _requestRepo.GetByIdAsync(id);
        if (request is null) return NotFound();
        if (request.Status != VendorRequestStatus.Pending)
            return Conflict(new { error = $"Request is already {request.Status}." });

        request.Status = VendorRequestStatus.Rejected;
        request.ReviewedByUserId = User.GetUserId();
        request.ReviewedDate = DateTime.UtcNow;
        request.Remarks = body?.Remarks ?? request.Remarks;
        await _requestRepo.UpdateAsync(request);

        await _auditLog.LogAsync("VendorAccessRejected", request.VendorId, User.GetUserId(), $"RequestId={id}");
        return Ok(request);
    }

    private static object Project(VendorRequest r) => new
    {
        r.Id,
        r.RequestedBuyingEntityId,
        BuyingEntityName = r.RequestedBuyingEntity.Name,
        r.RequestedPropertyId,
        PropertyName = r.RequestedProperty?.Name,
        RequestType = r.RequestType.ToString(),
        Status = r.Status.ToString(),
        r.RequestedDate,
        r.ReviewedDate,
        r.Remarks,
    };
}
