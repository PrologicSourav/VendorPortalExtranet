using Microsoft.AspNetCore.Mvc;
using WebProlific.Core.Entities;
using WebProlific.Core.Interfaces;

namespace WebProlific.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CataloguesController : ControllerBase
{
    private readonly ICatalogueRepository _catRepo;

    public CataloguesController(ICatalogueRepository catRepo) => _catRepo = catRepo;

    [HttpGet("vendor/{vendorId:guid}")]
    public async Task<IActionResult> GetByVendor(Guid vendorId, [FromQuery] string? status)
    {
        var catalogues = await _catRepo.GetByVendorAsync(vendorId, status);
        return Ok(catalogues);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var catalogue = await _catRepo.GetByIdAsync(id);
        return catalogue is null ? NotFound() : Ok(catalogue);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Catalogue catalogue)
    {
        catalogue.Id = Guid.NewGuid();
        catalogue.CreatedAt = DateTime.UtcNow;
        catalogue.UpdatedAt = DateTime.UtcNow;
        var created = await _catRepo.CreateAsync(catalogue);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:guid}/submit")]
    public async Task<IActionResult> Submit(Guid id)
    {
        var catalogue = await _catRepo.GetByIdAsync(id);
        if (catalogue is null) return NotFound();

        catalogue.Status = CatalogueStatus.Submitted;
        catalogue.SubmittedDate = DateTime.UtcNow;
        catalogue.UpdatedAt = DateTime.UtcNow;
        var updated = await _catRepo.UpdateAsync(catalogue);
        return Ok(updated);
    }

    [HttpPut("{id:guid}/approve")]
    public async Task<IActionResult> Approve(Guid id)
    {
        var catalogue = await _catRepo.GetByIdAsync(id);
        if (catalogue is null) return NotFound();

        catalogue.Status = CatalogueStatus.Approved;
        catalogue.ApprovedDate = DateTime.UtcNow;
        catalogue.UpdatedAt = DateTime.UtcNow;
        var updated = await _catRepo.UpdateAsync(catalogue);
        return Ok(updated);
    }

    [HttpPut("{id:guid}/reject")]
    public async Task<IActionResult> Reject(Guid id, [FromBody] RejectRequest request)
    {
        var catalogue = await _catRepo.GetByIdAsync(id);
        if (catalogue is null) return NotFound();

        catalogue.Status = CatalogueStatus.Rejected;
        catalogue.RejectionReason = request.Reason;
        catalogue.UpdatedAt = DateTime.UtcNow;
        var updated = await _catRepo.UpdateAsync(catalogue);
        return Ok(updated);
    }
}

public class RejectRequest { public string Reason { get; set; } = string.Empty; }
