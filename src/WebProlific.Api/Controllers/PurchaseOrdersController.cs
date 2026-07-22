using Microsoft.AspNetCore.Authorization;
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
public class PurchaseOrdersController : ControllerBase
{
    private readonly IPurchaseOrderRepository _poRepo;
    private readonly AppDbContext _db;
    private readonly ICurrencyConversionService _currencyConverter;

    public PurchaseOrdersController(IPurchaseOrderRepository poRepo, AppDbContext db, ICurrencyConversionService currencyConverter)
    {
        _poRepo = poRepo;
        _db = db;
        _currencyConverter = currencyConverter;
    }

    [HttpGet("vendor/{vendorId:guid}")]
    public async Task<IActionResult> GetByVendor(Guid vendorId, [FromQuery] string? status, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        if (!User.CanAccessVendor(vendorId)) return Forbid();

        var pos = await _poRepo.GetByVendorAsync(vendorId, status, page, pageSize);
        // Resolve user's preferred currency (set by middleware)
        var preferredCurrency = HttpContext.Items["UserCurrency"] as string ?? "INR";
        var total = await _poRepo.GetVendorPoCountAsync(vendorId, status);
        var items = new List<object>();
        foreach (var po in pos)
        {
            var displayValue = await _currencyConverter.ConvertAsync(po.TotalValue, po.Currency, preferredCurrency);
            items.Add(new
            {
                po.Id,
                po.PoNumber,
                po.VendorId,
                po.BuyingEntityId,
                po.PropertyId,
                po.OrderDate,
                po.RequiredByDate,
                TotalValue = po.TotalValue,
                TransactionCurrencyCode = po.Currency,
                po.Status,
                po.AcknowledgmentReason,
                po.CreatedAt,
                po.UpdatedAt,
                DisplayValue = displayValue,
                DisplayCurrencyCode = displayValue.HasValue ? preferredCurrency : null
            });
        }
        return Ok(new { items, total, page, pageSize });
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var po = await _poRepo.GetByIdAsync(id);
        if (po is null) return NotFound();
        if (!User.CanAccessVendor(po.VendorId)) return Forbid();
        var preferredCurrency = HttpContext.Items["UserCurrency"] as string ?? "INR";
        var displayValue = await _currencyConverter.ConvertAsync(po.TotalValue, po.Currency, preferredCurrency);
        return Ok(new
        {
            po.Id,
            po.PoNumber,
            po.VendorId,
            po.BuyingEntityId,
            po.PropertyId,
            po.OrderDate,
            po.RequiredByDate,
            TotalValue = po.TotalValue,
            TransactionCurrencyCode = po.Currency,
            po.Status,
            po.AcknowledgmentReason,
            po.CreatedAt,
            po.UpdatedAt,
            DisplayValue = displayValue,
            DisplayCurrencyCode = displayValue.HasValue ? preferredCurrency : null
        });
    }

    [HttpPost]
    [Authorize(Policy = "InternalOnly")]
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
        if (!User.CanAccessVendor(po.VendorId)) return Forbid();
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
        if (!User.CanAccessVendor(po.VendorId)) return Forbid();
        po.Status = PoStatus.PartiallyAccepted;
        po.UpdatedAt = DateTime.UtcNow;
        var updated = await _poRepo.UpdateAsync(po);
        return Ok(updated);
    }

    [HttpPut("{id:guid}/unable-to-supply")]
    public async Task<IActionResult> UnableToSupply(Guid id, [FromBody] UnableToSupplyRequest request)
    {
        var po = await _poRepo.GetByIdAsync(id);
        if (po is null) return NotFound();
        if (!User.CanAccessVendor(po.VendorId)) return Forbid();
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
