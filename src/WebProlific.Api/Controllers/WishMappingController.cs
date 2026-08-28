using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebProlific.Infrastructure.Data;

namespace WebProlific.Api.Controllers;

/// <summary>Lets internal staff link a Vendor Portal vendor/property to its real
/// Web Prol'IFIC (WISH) vendor_id/property_id, so the WISH PO sync can find it
/// reliably — GSTIN/PAN matching alone misses vendors WISH never recorded a GSTIN
/// for. Read/write only against this system's own database; never touches WISH.</summary>
[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "InternalOnly")]
public class WishMappingController : ControllerBase
{
    private readonly AppDbContext _db;

    public WishMappingController(AppDbContext db) => _db = db;

    [HttpGet("vendors")]
    public async Task<IActionResult> GetVendors([FromQuery] string? search)
    {
        var query = _db.Vendors.AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(v => v.LegalName.Contains(search) || (v.Gstin != null && v.Gstin.Contains(search)));

        var vendors = await query
            .OrderBy(v => v.LegalName)
            .Select(v => new
            {
                v.Id,
                v.LegalName,
                v.Gstin,
                v.Pan,
                v.WishVendorId,
            })
            .ToListAsync();
        return Ok(vendors);
    }

    [HttpPut("vendors/{id:guid}")]
    public async Task<IActionResult> SetVendorMapping(Guid id, [FromBody] SetMappingRequest request)
    {
        var vendor = await _db.Vendors.FirstOrDefaultAsync(v => v.Id == id);
        if (vendor is null) return NotFound();
        vendor.WishVendorId = string.IsNullOrWhiteSpace(request.WishId) ? null : request.WishId.Trim();
        await _db.SaveChangesAsync();
        return Ok(new { vendor.Id, vendor.WishVendorId });
    }

    [HttpGet("properties")]
    public async Task<IActionResult> GetProperties([FromQuery] string? search)
    {
        var query = _db.Properties.Include(p => p.BuyingEntity).AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(p => p.Name.Contains(search) || (p.Code != null && p.Code.Contains(search)));

        var properties = await query
            .OrderBy(p => p.Name)
            .Select(p => new
            {
                p.Id,
                p.Name,
                p.Code,
                BuyingEntityName = p.BuyingEntity.Name,
                p.WishPropertyId,
            })
            .ToListAsync();
        return Ok(properties);
    }

    [HttpPut("properties/{id:guid}")]
    public async Task<IActionResult> SetPropertyMapping(Guid id, [FromBody] SetMappingRequest request)
    {
        var property = await _db.Properties.FirstOrDefaultAsync(p => p.Id == id);
        if (property is null) return NotFound();
        property.WishPropertyId = string.IsNullOrWhiteSpace(request.WishId) ? null : request.WishId.Trim();
        await _db.SaveChangesAsync();
        return Ok(new { property.Id, property.WishPropertyId });
    }
}

public class SetMappingRequest
{
    public string? WishId { get; set; }
}
