using Microsoft.AspNetCore.Mvc;
using WebProlific.Api.Extensions;
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
        var notes = (await _dnRepo.GetByPurchaseOrderAsync(poId)).ToList();
        if (notes.Count > 0 && !User.CanAccessVendor(notes[0].VendorId)) return Forbid();
        return Ok(notes);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var dn = await _dnRepo.GetByIdAsync(id);
        if (dn is null) return NotFound();
        if (!User.CanAccessVendor(dn.VendorId)) return Forbid();
        return Ok(dn);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] DeliveryNote deliveryNote)
    {
        if (!User.IsInternal())
        {
            var callerVendorId = User.GetVendorId();
            if (callerVendorId is null) return Forbid();
            deliveryNote.VendorId = callerVendorId.Value;
        }

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
        if (!User.CanAccessVendor(dn.VendorId)) return Forbid();

        dn.Status = DeliveryNoteStatus.Submitted;
        var updated = await _dnRepo.UpdateAsync(dn);
        return Ok(updated);
    }
}
