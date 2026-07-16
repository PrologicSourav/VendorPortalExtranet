using Microsoft.AspNetCore.Mvc;
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
    public async Task<IActionResult> GetPending()
    {
        var requests = await _mcRepo.GetPendingAsync();
        return Ok(requests);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var request = await _mcRepo.GetByIdAsync(id);
        return request is null ? NotFound() : Ok(request);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] KycChangeRequest request)
    {
        request.Id = Guid.NewGuid();
        request.RequestedDate = DateTime.UtcNow;
        request.Status = MakerCheckerStatus.Pending;
        var created = await _mcRepo.CreateAsync(request);
        return Ok(created);
    }

    [HttpPut("{id:guid}/approve")]
    public async Task<IActionResult> Approve(Guid id, [FromBody] ApproveRejectRequest request)
    {
        var existing = await _mcRepo.GetByIdAsync(id);
        if (existing is null) return NotFound();

        existing.Status = MakerCheckerStatus.Approved;
        existing.ApprovedBy = request.ApprovedBy;
        existing.ActionDate = DateTime.UtcNow;
        var updated = await _mcRepo.UpdateAsync(existing);

        // TODO: If bank details change, unblock payment scheduling
        // TODO: Update vendor record with new values
        // TODO: Create audit log entry ("This decision is logged with your name and timestamp")

        return Ok(updated);
    }

    [HttpPut("{id:guid}/reject")]
    public async Task<IActionResult> Reject(Guid id, [FromBody] ApproveRejectRequest request)
    {
        var existing = await _mcRepo.GetByIdAsync(id);
        if (existing is null) return NotFound();

        existing.Status = MakerCheckerStatus.Rejected;
        existing.ApprovedBy = request.ApprovedBy;
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
