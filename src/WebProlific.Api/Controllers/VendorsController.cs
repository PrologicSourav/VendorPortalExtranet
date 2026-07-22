using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using WebProlific.Api.Extensions;
using WebProlific.Core.Entities;
using WebProlific.Core.Interfaces;
using Microsoft.Extensions.Logging;

namespace WebProlific.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class VendorsController : ControllerBase
{
    private readonly IVendorRepository _vendorRepo;
    private readonly ILogger<VendorsController> _logger;

    public VendorsController(IVendorRepository vendorRepo, ILogger<VendorsController> logger)
    {
        _vendorRepo = vendorRepo;
        _logger = logger;
    }

    [HttpGet]
    [Authorize(Policy = "InternalOnly")]
    public async Task<IActionResult> GetAll([FromQuery] string? status, [FromQuery] string? search, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        _logger.LogInformation("Getting vendors list - Status: {Status}, Search: {Search}, Page: {Page}, PageSize: {PageSize}",
            status ?? "all", search ?? "none", page, pageSize);
        
        var vendors = await _vendorRepo.GetAllAsync(status, search, page, pageSize);
        var total = await _vendorRepo.GetCountAsync(status, search);
        
        _logger.LogInformation("Returned {Count} vendors (total: {Total})", vendors.Count(), total);
        return Ok(new { items = vendors, total, page, pageSize });
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        if (!User.CanAccessVendor(id)) return Forbid();

        _logger.LogInformation("Getting vendor by ID: {VendorId}", id);

        var vendor = await _vendorRepo.GetByIdAsync(id);
        if (vendor is null)
        {
            _logger.LogWarning("Vendor not found with ID: {VendorId}", id);
            return NotFound();
        }
        
        _logger.LogInformation("Retrieved vendor: {VendorId} ({LegalName})", vendor.Id, vendor.LegalName);
        return Ok(vendor);
    }

    [HttpPost]
    [Authorize(Policy = "InternalOnly")]
    public async Task<IActionResult> Create([FromBody] Vendor vendor)
    {
        _logger.LogInformation("Creating new vendor: {LegalName} (GSTIN: {Gstin})",
            vendor.LegalName, vendor.Gstin ?? "null");
        
        if (await _vendorRepo.ExistsByGstinAsync(vendor.Gstin))
        {
            _logger.LogWarning("Vendor creation failed: GSTIN already exists: {Gstin}", vendor.Gstin);
            return Conflict(new { error = "A vendor with this GSTIN already exists — cannot create silently." });
        }

        vendor.Id = Guid.NewGuid();
        vendor.CreatedAt = DateTime.UtcNow;
        vendor.UpdatedAt = DateTime.UtcNow;
        var created = await _vendorRepo.CreateAsync(vendor);
        
        _logger.LogInformation("Vendor created successfully: {VendorId}", created.Id);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] Vendor vendor)
    {
        if (!User.CanAccessVendor(id)) return Forbid();

        _logger.LogInformation("Updating vendor: {VendorId}", id);

        var existing = await _vendorRepo.GetByIdAsync(id);
        if (existing is null)
        {
            _logger.LogWarning("Vendor update failed: Vendor not found with ID: {VendorId}", id);
            return NotFound();
        }

        existing.LegalName = vendor.LegalName;
        existing.TradingName = vendor.TradingName;
        existing.Address = vendor.Address;
        existing.City = vendor.City;
        existing.State = vendor.State;
        existing.ContactEmail = vendor.ContactEmail;
        existing.ContactPhone = vendor.ContactPhone;
        existing.UpdatedAt = DateTime.UtcNow;

        var updated = await _vendorRepo.UpdateAsync(existing);
        
        _logger.LogInformation("Vendor updated successfully: {VendorId}", updated.Id);
        return Ok(updated);
    }
}
