using Microsoft.AspNetCore.Mvc;
using WebProlific.Api.Extensions;
using WebProlific.Core.Entities;
using WebProlific.Core.Interfaces;
using WebProlific.Infrastructure.Data;
using WebProlific.Api.Services;
using System.Security.Claims;

namespace WebProlific.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class InvoicesController : ControllerBase
{
    private readonly IInvoiceRepository _invRepo;
    private readonly AppDbContext _db;
    private readonly ICurrencyConversionService _currencyConverter;

    public InvoicesController(IInvoiceRepository invRepo, AppDbContext db, ICurrencyConversionService currencyConverter)
    {
        _invRepo = invRepo;
        _db = db;
        _currencyConverter = currencyConverter;
    }

    [HttpGet("vendor/{vendorId:guid}")]
    public async Task<IActionResult> GetByVendor(Guid vendorId, [FromQuery] string? status, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        if (!User.CanAccessVendor(vendorId)) return Forbid();

        var invoices = await _invRepo.GetByVendorAsync(vendorId, status, page, pageSize);
        var preferredCurrency = HttpContext.Items["UserCurrency"] as string ?? "INR";
        var total = await _invRepo.GetVendorInvoiceCountAsync(vendorId, status);
        var items = new List<object>();
        foreach (var inv in invoices)
        {
            var displayTotal = await _currencyConverter.ConvertAsync(inv.TotalAmount, inv.Currency, preferredCurrency);
            items.Add(new
            {
                inv.Id,
                inv.InvoiceNumber,
                inv.VendorId,
                inv.PurchaseOrderId,
                inv.InvoiceDate,
                TransactionCurrencyCode = inv.Currency,
                inv.SubTotal,
                inv.TaxAmount,
                TotalAmount = inv.TotalAmount,
                inv.Status,
                inv.MatchStatus,
                inv.MismatchReasons,
                inv.InvoicePdfUrl,
                inv.CreatedAt,
                DisplayTotal = displayTotal,
                DisplayCurrencyCode = displayTotal.HasValue ? preferredCurrency : null
            });
        }
        return Ok(new { items, total, page, pageSize });
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var invoice = await _invRepo.GetByIdAsync(id);
        if (invoice is null) return NotFound();
        if (!User.CanAccessVendor(invoice.VendorId)) return Forbid();
        var preferredCurrency = HttpContext.Items["UserCurrency"] as string ?? "INR";
        var displayTotal = await _currencyConverter.ConvertAsync(invoice.TotalAmount, invoice.Currency, preferredCurrency);
        return Ok(new
        {
            invoice.Id,
            invoice.InvoiceNumber,
            invoice.VendorId,
            invoice.PurchaseOrderId,
            invoice.InvoiceDate,
            TransactionCurrencyCode = invoice.Currency,
            invoice.SubTotal,
            invoice.TaxAmount,
            TotalAmount = invoice.TotalAmount,
            invoice.Status,
            invoice.MatchStatus,
            invoice.MismatchReasons,
            invoice.InvoicePdfUrl,
            invoice.CreatedAt,
            DisplayTotal = displayTotal,
            DisplayCurrencyCode = displayTotal.HasValue ? preferredCurrency : null
        });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Invoice invoice)
    {
        if (!User.IsInternal())
        {
            var callerVendorId = User.GetVendorId();
            if (callerVendorId is null) return Forbid();
            invoice.VendorId = callerVendorId.Value;
        }

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
