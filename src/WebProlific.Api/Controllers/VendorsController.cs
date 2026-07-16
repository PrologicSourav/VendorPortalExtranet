using Microsoft.AspNetCore.Mvc;
using WebProlific.Core.Entities;
using WebProlific.Core.Interfaces;

namespace WebProlific.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class VendorsController : ControllerBase
{
    private readonly IVendorRepository _vendorRepo;

    public VendorsController(IVendorRepository vendorRepo) => _vendorRepo = vendorRepo;

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? status, [FromQuery] string? search, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var vendors = await _vendorRepo.GetAllAsync(status, search, page, pageSize);
        var total = await _vendorRepo.GetCountAsync(status, search);
        return Ok(new { items = vendors, total, page, pageSize });
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var vendor = await _vendorRepo.GetByIdAsync(id);
        return vendor is null ? NotFound() : Ok(vendor);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Vendor vendor)
    {
        if (await _vendorRepo.ExistsByGstinAsync(vendor.Gstin))
            return Conflict(new { error = "A vendor with this GSTIN already exists — cannot create silently." });

        vendor.Id = Guid.NewGuid();
        vendor.CreatedAt = DateTime.UtcNow;
        vendor.UpdatedAt = DateTime.UtcNow;
        var created = await _vendorRepo.CreateAsync(vendor);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] Vendor vendor)
    {
        var existing = await _vendorRepo.GetByIdAsync(id);
        if (existing is null) return NotFound();

        existing.LegalName = vendor.LegalName;
        existing.TradingName = vendor.TradingName;
        existing.Address = vendor.Address;
        existing.City = vendor.City;
        existing.State = vendor.State;
        existing.ContactEmail = vendor.ContactEmail;
        existing.ContactPhone = vendor.ContactPhone;
        existing.UpdatedAt = DateTime.UtcNow;

        var updated = await _vendorRepo.UpdateAsync(existing);
        return Ok(updated);
    }
}
