using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebProlific.Api.Extensions;
using WebProlific.Core.Entities;
using WebProlific.Core.Interfaces;

namespace WebProlific.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MakerCheckerController : ControllerBase
{
    private readonly IMakerCheckerRepository _mcRepo;

    public MakerCheckerController(IMakerCheckerRepository mcRepo) => _mcRepo = mcRepo;

    [HttpGet("pending")]
    [Authorize(Policy = "InternalOnly")]
    public async Task<IActionResult> GetPending()
    {
        var requests = await _mcRepo.GetPendingAsync();
        return Ok(requests);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var request = await _mcRepo.GetByIdAsync(id);
        if (request is null) return NotFound();
        if (!User.CanAccessVendor(request.VendorId)) return Forbid();
        return Ok(request);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] KycChangeRequest request)
    {
        if (!User.IsInternal())
        {
            var callerVendorId = User.GetVendorId();
            if (callerVendorId is null) return Forbid();
            request.VendorId = callerVendorId.Value;
        }

        var callerUserId = User.GetUserId();
        if (callerUserId is null) return Forbid();
        request.RequestedByUserId = callerUserId.Value;
        request.RequestedBy = User.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value ?? string.Empty;

        request.Id = Guid.NewGuid();
        request.RequestedDate = DateTime.UtcNow;
        request.Status = MakerCheckerStatus.Pending;
        var created = await _mcRepo.CreateAsync(request);
        return Ok(created);
    }

    [HttpPut("{id:guid}/approve")]
    [Authorize(Policy = "InternalOnly")]
    public async Task<IActionResult> Approve(Guid id, [FromBody] ApproveRejectRequest request)
    {
        var existing = await _mcRepo.GetByIdAsync(id);
        if (existing is null) return NotFound();

        existing.Status = MakerCheckerStatus.Approved;
        existing.ApprovedByUserId = User.GetUserId();
        existing.ApprovedBy = User.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value;
        existing.ActionDate = DateTime.UtcNow;
        var updated = await _mcRepo.UpdateAsync(existing);

        // TODO: If bank details change, unblock payment scheduling
        // TODO: Update vendor record with new values
        // TODO: Create audit log entry ("This decision is logged with your name and timestamp")

        return Ok(updated);
    }

    [HttpPut("{id:guid}/reject")]
    [Authorize(Policy = "InternalOnly")]
    public async Task<IActionResult> Reject(Guid id, [FromBody] ApproveRejectRequest request)
    {
        var existing = await _mcRepo.GetByIdAsync(id);
        if (existing is null) return NotFound();

        existing.Status = MakerCheckerStatus.Rejected;
        existing.ApprovedByUserId = User.GetUserId();
        existing.ApprovedBy = User.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value;
        existing.RejectionReason = request.Reason;
        existing.ActionDate = DateTime.UtcNow;
        var updated = await _mcRepo.UpdateAsync(existing);
        return Ok(updated);
    }
}

public class ApproveRejectRequest
{
    public string? ApprovedBy { get; set; }
    public string? Reason { get; set; }
}
