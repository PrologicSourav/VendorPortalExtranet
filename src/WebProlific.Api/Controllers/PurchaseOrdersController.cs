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
    private readonly IVendorRelationshipRepository _relationshipRepo;

    public PurchaseOrdersController(
        IPurchaseOrderRepository poRepo, AppDbContext db, ICurrencyConversionService currencyConverter,
        IVendorRelationshipRepository relationshipRepo)
    {
        _poRepo = poRepo;
        _db = db;
        _currencyConverter = currencyConverter;
        _relationshipRepo = relationshipRepo;
    }

    [HttpGet("vendor/{vendorId:guid}")]
    public async Task<IActionResult> GetByVendor(Guid vendorId, [FromQuery] string? status, [FromQuery] Guid? propertyId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        if (!User.CanAccessVendor(vendorId)) return Forbid();

        // A vendor-supplied propertyId is never trusted at face value — internal
        // staff can filter by any property, but a vendor user must actually have
        // an active VendorRelationship covering it (directly, or via a chain-wide
        // relationship on that property's BuyingEntity), further narrowed by
        // their own VendorUserAccess grants if they have any.
        if (propertyId.HasValue && !User.IsInternal())
        {
            var property = await _db.Properties.FindAsync(propertyId.Value);
            if (property is null || !await _relationshipRepo.HasActiveAccessAsync(vendorId, property.BuyingEntityId, propertyId, User.GetUserId()))
                return Forbid();
        }

        var pos = await _poRepo.GetByVendorAsync(vendorId, status, propertyId, page, pageSize);
        // Resolve user's preferred currency (set by middleware)
        var preferredCurrency = HttpContext.Items["UserCurrency"] as string ?? "INR";
        var total = await _poRepo.GetVendorPoCountAsync(vendorId, status, propertyId);
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
                EntityName = po.BuyingEntity?.Name,
                po.PropertyId,
                PropertyName = po.Property?.Name,
                po.OrderDate,
                po.RequiredByDate,
                LineCount = po.Lines?.Count ?? 0,
                // The 3 highest-value line items — lets the list give a sense of
                // what's actually on the PO without opening the detail drawer.
                TopItems = (po.Lines ?? new List<PurchaseOrderLine>())
                    .OrderByDescending(l => l.LineTotal)
                    .Take(3)
                    .Select(l => new { l.ItemDescription, l.LineTotal })
                    .ToList(),
                TotalValue = po.TotalValue,
                TransactionCurrencyCode = po.Currency,
                po.Status,
                po.AcknowledgmentReason,
                po.HasPrintedDocument,
                po.PrintedDocumentFileName,
                po.PrintedDocumentUploadedAt,
                po.CreatedAt,
                po.UpdatedAt,
                DisplayValue = displayValue,
                DisplayCurrencyCode = displayValue.HasValue ? preferredCurrency : null
            });
        }
        return Ok(new { items, total, page, pageSize });
    }

    /// <summary>Cross-vendor PO lookup for internal staff — used by the governance
    /// console to find a PO and attach its printed document.</summary>
    [HttpGet]
    [Authorize(Policy = "InternalOnly")]
    public async Task<IActionResult> Search([FromQuery] string? search, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var pos = await _poRepo.SearchAsync(search, page, pageSize);
        var total = await _poRepo.SearchCountAsync(search);
        var items = pos.Select(po => new
        {
            po.Id,
            po.PoNumber,
            VendorName = po.Vendor?.LegalName,
            PropertyName = po.Property?.Name,
            po.OrderDate,
            po.Status,
            po.TotalValue,
            TransactionCurrencyCode = po.Currency,
            po.HasPrintedDocument,
            po.PrintedDocumentFileName,
            po.PrintedDocumentUploadedAt,
        });
        return Ok(new { items, total, page, pageSize });
    }

    /// <summary>Properties this vendor is actually authorized to operate in (via an
    /// active VendorRelationship — direct or chain-wide) — populates the supplier
    /// portal's workspace switcher. Independent of PO history, so a newly-approved
    /// vendor sees the property before their first PO ever lands.</summary>
    [HttpGet("vendor/{vendorId:guid}/properties")]
    public async Task<IActionResult> GetVendorProperties(Guid vendorId)
    {
        if (!User.CanAccessVendor(vendorId)) return Forbid();

        // Only narrow by VendorUserAccess for an actual vendor user viewing their
        // own workspace switcher — an internal staff member's own user id has no
        // relevance to this vendor's per-user grants.
        var userId = User.IsInternal() ? null : User.GetUserId();
        var properties = await _relationshipRepo.GetEffectivePropertiesAsync(vendorId, userId);
        var result = properties.Select(p => new { p.Id, p.Name, p.Code, p.City });
        return Ok(result);
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
            EntityName = po.BuyingEntity?.Name,
            po.PropertyId,
            PropertyName = po.Property?.Name,
            po.OrderDate,
            po.RequiredByDate,
            TotalValue = po.TotalValue,
            TransactionCurrencyCode = po.Currency,
            po.Status,
            po.AcknowledgmentReason,
            po.Remarks,
            po.DispatchInstructions,
            po.PackingInstructions,
            po.HasPrintedDocument,
            po.PrintedDocumentFileName,
            po.PrintedDocumentUploadedAt,
            po.CreatedAt,
            po.UpdatedAt,
            DisplayValue = displayValue,
            DisplayCurrencyCode = displayValue.HasValue ? preferredCurrency : null,
            TaxTotal = po.Lines.Sum(l => l.TaxAmount),
            Lines = po.Lines.Select(l => new
            {
                l.Id,
                l.ItemDescription,
                l.QtyOrdered,
                l.QtyAccepted,
                l.QtyDelivered,
                l.Uom,
                l.UnitPrice,
                l.LineTotal,
                l.TaxClass,
                l.TaxAmount
            })
        });
    }

    /// <summary>Uploads (or replaces) the printed PO document — the actual PDF the
    /// property produced, so vendors see exactly what was printed. Internal staff only.</summary>
    [HttpPost("{id:guid}/document")]
    [Authorize(Policy = "InternalOnly")]
    [RequestSizeLimit(MaxDocumentBytes)]
    public async Task<IActionResult> UploadDocument(Guid id, IFormFile? file)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { message = "No file was uploaded." });
        if (file.Length > MaxDocumentBytes)
            return BadRequest(new { message = "File is too large (max 15 MB)." });
        var isPdf = file.ContentType == "application/pdf"
            || string.Equals(Path.GetExtension(file.FileName), ".pdf", StringComparison.OrdinalIgnoreCase);
        if (!isPdf)
            return BadRequest(new { message = "Only PDF files are accepted." });

        using var stream = new MemoryStream();
        await file.CopyToAsync(stream);
        var stored = await _poRepo.SetDocumentAsync(id, stream.ToArray(), file.FileName);
        if (!stored) return NotFound();
        return Ok(new { message = "Document uploaded." });
    }

    /// <summary>Streams the uploaded PO document back — vendors (their own PO only)
    /// and internal staff can both view/download it.</summary>
    [HttpGet("{id:guid}/document")]
    public async Task<IActionResult> GetDocument(Guid id)
    {
        var po = await _poRepo.GetByIdAsync(id);
        if (po is null) return NotFound();
        if (!User.CanAccessVendor(po.VendorId)) return Forbid();

        var doc = await _poRepo.GetDocumentAsync(id);
        if (doc is null) return NotFound();
        return File(doc.Content, "application/pdf", po.PrintedDocumentFileName ?? "purchase-order.pdf");
    }

    private const long MaxDocumentBytes = 15 * 1024 * 1024;

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
