using Microsoft.AspNetCore.Mvc;
using WebProlific.Core.Entities;
using WebProlific.Core.Interfaces;

namespace WebProlific.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PurchaseOrdersController : ControllerBase
{
    private readonly IPurchaseOrderRepository _poRepo;

    public PurchaseOrdersController(IPurchaseOrderRepository poRepo) => _poRepo = poRepo;

    [HttpGet("vendor/{vendorId:guid}")]
    public async Task<IActionResult> GetByVendor(Guid vendorId, [FromQuery] string? status, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var pos = await _poRepo.GetByVendorAsync(vendorId, status, page, pageSize);
        var total = await _poRepo.GetVendorPoCountAsync(vendorId, status);
        return Ok(new { items = pos, total, page, pageSize });
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var po = await _poRepo.GetByIdAsync(id);
        return po is null ? NotFound() : Ok(po);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] PurchaseOrder po)
    {
        po.Id = Guid.NewGuid();
        po.PoNumber = $"PO-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..6].ToUpper()}";
        po.CreatedAt = DateTime.UtcNow;
        po.UpdatedAt = DateTime.UtcNow;
        var created = await _poRepo.CreateAsync(po);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:guid}/acknowledge")]
    public async Task<IActionResult> Acknowledge(Guid id, [FromBody] AcknowledgeRequest request)
    {
        var po = await _poRepo.GetByIdAsync(id);
        if (po is null) return NotFound();

        po.Status = PoStatus.Acknowledged;
        po.UpdatedAt = DateTime.UtcNow;
        var updated = await _poRepo.UpdateAsync(po);
        return Ok(updated);
    }

    [HttpPut("{id:guid}/partial-accept")]
    public async Task<IActionResult> PartialAccept(Guid id, [FromBody] PartialAcceptRequest request)
    {
        var po = await _poRepo.GetByIdAsync(id);
        if (po is null) return NotFound();

        po.Status = PoStatus.PartiallyAccepted;
        po.UpdatedAt = DateTime.UtcNow;
        // In real app: update line items with accepted quantities
        var updated = await _poRepo.UpdateAsync(po);
        return Ok(updated);
    }

    [HttpPut("{id:guid}/unable-to-supply")]
    public async Task<IActionResult> UnableToSupply(Guid id, [FromBody] UnableToSupplyRequest request)
    {
        var po = await _poRepo.GetByIdAsync(id);
        if (po is null) return NotFound();

        po.Status = PoStatus.UnableToSupply;
        po.AcknowledgmentReason = request.Reason;
        po.UpdatedAt = DateTime.UtcNow;
        var updated = await _poRepo.UpdateAsync(po);
        return Ok(updated);
    }
}

public class AcknowledgeRequest { }
public class PartialAcceptRequest { public List<PartialLineAcceptance>? Lines { get; set; } }
public class PartialLineAcceptance { public Guid LineId { get; set; } public decimal AcceptedQty { get; set; } public string? Reason { get; set; } }
public class UnableToSupplyRequest { public string Reason { get; set; } = string.Empty; }
