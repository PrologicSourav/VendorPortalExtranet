using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebProlific.Api.Extensions;
using WebProlific.Core.Entities;
using WebProlific.Core.Interfaces;

namespace WebProlific.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class KycController : ControllerBase
{
    private readonly IKycRepository _kycRepo;
    private readonly IVendorRepository _vendorRepo;

    public KycController(IKycRepository kycRepo, IVendorRepository vendorRepo)
    {
        _kycRepo = kycRepo;
        _vendorRepo = vendorRepo;
    }

    [HttpGet("queue")]
    [Authorize(Policy = "InternalOnly")]
    public async Task<IActionResult> GetQueue([FromQuery] string? status, [FromQuery] string? search, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var vendors = await _kycRepo.GetKycQueueAsync(status, search, page, pageSize);
        var total = await _kycRepo.GetKycQueueCountAsync(status, search);
        return Ok(new { items = vendors, total, page, pageSize });
    }

    [HttpGet("vendor/{vendorId:guid}")]
    public async Task<IActionResult> GetVendorProfile(Guid vendorId)
    {
        if (!User.CanAccessVendor(vendorId)) return Forbid();

        var vendor = await _vendorRepo.GetByIdAsync(vendorId);
        if (vendor is null) return NotFound();

        var documents = await _kycRepo.GetDocumentsAsync(vendorId);
        return Ok(new { vendor, documents });
    }

    [HttpGet("vendor/{vendorId:guid}/documents")]
    public async Task<IActionResult> GetDocuments(Guid vendorId)
    {
        if (!User.CanAccessVendor(vendorId)) return Forbid();

        var documents = await _kycRepo.GetDocumentsAsync(vendorId);
        return Ok(documents);
    }

    [HttpPost("vendor/{vendorId:guid}/documents")]
    public async Task<IActionResult> AddDocument(Guid vendorId, [FromBody] VendorDocument document)
    {
        if (!User.CanAccessVendor(vendorId)) return Forbid();

        document.Id = Guid.NewGuid();
        document.VendorId = vendorId;
        document.UploadDate = DateTime.UtcNow;
        var created = await _kycRepo.AddDocumentAsync(document);
        return Ok(created);
    }

    [HttpPut("vendor/{vendorId:guid}/validate")]
    [Authorize(Policy = "InternalOnly")]
    public async Task<IActionResult> SetValidated(Guid vendorId)
    {
        var vendor = await _vendorRepo.GetByIdAsync(vendorId);
        if (vendor is null) return NotFound();

        // Server-side check: all mandatory checks must pass
        // (In production, re-enforce all validation rules here)
        vendor.KycStatus = KycStatus.Validated;
        vendor.KycValidatedDate = DateTime.UtcNow;
        vendor.UpdatedAt = DateTime.UtcNow;
        await _vendorRepo.UpdateAsync(vendor);
        return Ok(vendor);
    }

    [HttpPut("vendor/{vendorId:guid}/block")]
    [Authorize(Policy = "InternalOnly")]
    public async Task<IActionResult> SetBlocked(Guid vendorId)
    {
        var vendor = await _vendorRepo.GetByIdAsync(vendorId);
        if (vendor is null) return NotFound();

        vendor.KycStatus = KycStatus.Blocked;
        vendor.UpdatedAt = DateTime.UtcNow;
        await _vendorRepo.UpdateAsync(vendor);
        return Ok(vendor);
    }
}
