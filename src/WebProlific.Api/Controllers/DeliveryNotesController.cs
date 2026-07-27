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
    public async Task<IActionResult> Create([FromBody] CreateDeliveryNoteRequest request)
    {
        Guid vendorId;
        if (!User.IsInternal())
        {
            var callerVendorId = User.GetVendorId();
            if (callerVendorId is null) return Forbid();
            vendorId = callerVendorId.Value;
        }
        else
        {
            if (request.VendorId is null || request.VendorId == Guid.Empty)
                return BadRequest(new { error = "vendorId is required." });
            vendorId = request.VendorId.Value;
        }

        var deliveryNote = new DeliveryNote
        {
            Id = Guid.NewGuid(),
            VendorId = vendorId,
            PurchaseOrderId = request.PurchaseOrderId,
            DeliveryNoteNumber = $"DN-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..6].ToUpper()}",
            ExpectedDeliveryDate = request.ExpectedDeliveryDate,
            TimeWindowStart = request.TimeWindowStart,
            TimeWindowEnd = request.TimeWindowEnd,
            Notes = request.Notes,
            Status = DeliveryNoteStatus.Draft,
            CreatedAt = DateTime.UtcNow,
            Lines = (request.Lines ?? new()).Select(l => new DeliveryNoteLine
            {
                Id = Guid.NewGuid(),
                ItemDescription = l.ItemDescription,
                QtyInDelivery = l.QtyInDelivery,
                BatchLotNumber = l.BatchLotNumber,
                ExpiryDate = l.ExpiryDate
            }).ToList()
        };

        var created = await _dnRepo.CreateAsync(deliveryNote);
        return CreatedAtAction(nameof(GetById), new { id = created.Id },
            new { created.Id, created.DeliveryNoteNumber, created.Status });
    }

    [HttpPut("{id:guid}/submit")]
    public async Task<IActionResult> Submit(Guid id)
    {
        var dn = await _dnRepo.GetByIdAsync(id);
        if (dn is null) return NotFound();
        if (!User.CanAccessVendor(dn.VendorId)) return Forbid();

        dn.Status = DeliveryNoteStatus.Submitted;
        var updated = await _dnRepo.UpdateAsync(dn);
        return Ok(new { updated.Id, updated.DeliveryNoteNumber, updated.Status });
    }
}

public class CreateDeliveryNoteRequest
{
    public Guid? VendorId { get; set; }
    public Guid PurchaseOrderId { get; set; }
    public DateTime ExpectedDeliveryDate { get; set; }
    public string? TimeWindowStart { get; set; }
    public string? TimeWindowEnd { get; set; }
    public string? Notes { get; set; }
    public List<CreateDeliveryNoteLineInput>? Lines { get; set; }
}

public class CreateDeliveryNoteLineInput
{
    public string ItemDescription { get; set; } = string.Empty;
    public decimal QtyInDelivery { get; set; }
    public string? BatchLotNumber { get; set; }
    public DateTime? ExpiryDate { get; set; }
}
