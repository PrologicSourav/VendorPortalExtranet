using Microsoft.AspNetCore.Mvc;
using WebProlific.Core.Entities;
using WebProlific.Core.Interfaces;

namespace WebProlific.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DeliveryNotesController : ControllerBase
{
    private readonly IDeliveryNoteRepository _dnRepo;

    public DeliveryNotesController(IDeliveryNoteRepository dnRepo) => _dnRepo = dnRepo;

    [HttpGet("po/{poId:guid}")]
    public async Task<IActionResult> GetByPo(Guid poId)
    {
        var notes = await _dnRepo.GetByPurchaseOrderAsync(poId);
        return Ok(notes);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var dn = await _dnRepo.GetByIdAsync(id);
        return dn is null ? NotFound() : Ok(dn);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] DeliveryNote deliveryNote)
    {
        deliveryNote.Id = Guid.NewGuid();
        deliveryNote.DeliveryNoteNumber = $"DN-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..6].ToUpper()}";
        deliveryNote.CreatedAt = DateTime.UtcNow;
        var created = await _dnRepo.CreateAsync(deliveryNote);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:guid}/submit")]
    public async Task<IActionResult> Submit(Guid id)
    {
        var dn = await _dnRepo.GetByIdAsync(id);
        if (dn is null) return NotFound();

        dn.Status = DeliveryNoteStatus.Submitted;
        var updated = await _dnRepo.UpdateAsync(dn);
        return Ok(updated);
    }
}
