using Microsoft.AspNetCore.Mvc;
using WebProlific.Core.Entities;
using WebProlific.Core.Interfaces;

namespace WebProlific.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class InvoicesController : ControllerBase
{
    private readonly IInvoiceRepository _invRepo;

    public InvoicesController(IInvoiceRepository invRepo) => _invRepo = invRepo;

    [HttpGet("vendor/{vendorId:guid}")]
    public async Task<IActionResult> GetByVendor(Guid vendorId, [FromQuery] string? status, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var invoices = await _invRepo.GetByVendorAsync(vendorId, status, page, pageSize);
        var total = await _invRepo.GetVendorInvoiceCountAsync(vendorId, status);
        return Ok(new { items = invoices, total, page, pageSize });
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var invoice = await _invRepo.GetByIdAsync(id);
        return invoice is null ? NotFound() : Ok(invoice);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Invoice invoice)
    {
        invoice.Id = Guid.NewGuid();
        invoice.CreatedAt = DateTime.UtcNow;

        // Three-way match calculation
        var mismatches = new List<string>();
        foreach (var line in invoice.Lines)
        {
            if (line.InvoicedQty > line.ExpectedQty)
                mismatches.Add($"Qty exceeds received for {line.ItemDescription}");
            if (line.InvoicedUnitPrice > line.ExpectedUnitPrice)
                mismatches.Add($"Unit price higher than PO for {line.ItemDescription} by {line.InvoicedUnitPrice - line.ExpectedUnitPrice:C}");
        }

        invoice.MatchStatus = mismatches.Any() ? MatchStatus.Mismatch : MatchStatus.Matched;
        invoice.MismatchReasons = mismatches.Any() ? string.Join("; ", mismatches) : null;
        invoice.Status = InvoiceStatus.Submitted;

        var created = await _invRepo.CreateAsync(invoice);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }
}
