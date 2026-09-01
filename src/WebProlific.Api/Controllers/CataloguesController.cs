using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebProlific.Api.Extensions;
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
        if (!User.CanAccessVendor(vendorId)) return Forbid();

        var catalogues = await _catRepo.GetByVendorAsync(vendorId, status);
        return Ok(catalogues);
    }

    /// <summary>Cross-vendor catalogue list for the governance review queue. Internal
    /// reviewers only — suppliers use the vendor-scoped endpoint above.</summary>
    [HttpGet]
    [Authorize(Policy = "InternalOnly")]
    public async Task<IActionResult> GetForReview([FromQuery] string? status)
    {
        // Narrows to a single chain when this governance session was launched
        // scoped to one property (see GovernancePropertyMiddleware) — Catalogue
        // is chain-scoped, not property-scoped, so this matches the chain the
        // scoped property belongs to.
        var buyingEntityId = HttpContext.GetGovernanceBuyingEntityId();
        var catalogues = await _catRepo.GetByStatusAsync(status, buyingEntityId);
        var result = catalogues.Select(c => new CatalogueReviewDto
        {
            Id = c.Id,
            VendorId = c.VendorId,
            SupplierName = c.Vendor?.TradingName ?? c.Vendor?.LegalName ?? "Unknown supplier",
            VersionLabel = c.VersionLabel,
            Status = c.Status.ToString(),
            SubmittedDate = c.SubmittedDate,
            LineCount = c.Lines.Count,
            Lines = c.Lines.Select(l => new CatalogueReviewLineDto
            {
                ItemCode = l.ItemCode,
                Description = l.Description,
                PackUom = l.PackUom,
                Price = l.Price,
                Currency = l.Currency,
                ContractPrice = l.ContractPrice,
                DeviationPercent = l.DeviationPercent,
                MappedItemId = l.ItemId,
                MappedItemCode = l.Item != null ? l.Item.ItemCode : null,
                MappedItemDescription = l.Item != null ? l.Item.Description : null,
            }).ToList(),
        });
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var catalogue = await _catRepo.GetByIdAsync(id);
        if (catalogue is null) return NotFound();
        if (!User.CanAccessVendor(catalogue.VendorId)) return Forbid();
        return Ok(catalogue);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCatalogueRequest request)
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
            vendorId = request.VendorId;
        }

        var buyingEntityId = request.BuyingEntityId;
        if (buyingEntityId == Guid.Empty)
        {
            // No real buying-entity picker exists in the portal UI yet (VP-02) — default
            // to the first active entity rather than rejecting the request outright.
            var defaultEntityId = await _catRepo.GetDefaultBuyingEntityIdAsync();
            if (defaultEntityId is null)
                return BadRequest(new { message = "No active buying entity is configured; cannot create a catalogue." });
            buyingEntityId = defaultEntityId.Value;
        }

        // Built manually rather than binding [FromBody] Catalogue directly — the entity's
        // non-nullable Vendor/BuyingEntity navigation properties made ASP.NET's automatic
        // model validation reject every request as missing "required" fields the client
        // should never be sending in the first place.
        var catalogue = new Catalogue
        {
            Id = Guid.NewGuid(),
            VendorId = vendorId,
            BuyingEntityId = buyingEntityId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        try
        {
            var created = await _catRepo.CreateAsync(catalogue);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }
        catch (DbUpdateException)
        {
            // Most likely cause: VendorId/BuyingEntityId don't reference existing rows
            // (e.g. a database that hasn't been seeded) — surface this as a clear 400
            // instead of letting it bubble up as an opaque 500.
            return BadRequest(new { message = "Could not create catalogue — the vendor or buying entity could not be found." });
        }
    }

    [HttpPost("{id:guid}/lines")]
    public async Task<IActionResult> AddLines(Guid id, [FromBody] AddCatalogueLinesRequest request)
    {
        var catalogue = await _catRepo.GetByIdAsync(id);
        if (catalogue is null) return NotFound();
        if (!User.CanAccessVendor(catalogue.VendorId)) return Forbid();
        if (catalogue.Status != CatalogueStatus.Draft)
            return BadRequest(new { message = "Lines can only be added while the catalogue is in Draft status." });

        // Item codes must be unique within a catalogue — reject codes that are repeated
        // in this request or that already exist on the catalogue (case-insensitive).
        var existingCodes = catalogue.Lines
            .Select(l => l.ItemCode.Trim().ToLowerInvariant())
            .ToHashSet();
        var duplicates = request.Lines
            .Select(l => l.ItemCode.Trim())
            .GroupBy(c => c.ToLowerInvariant())
            .Where(g => g.Count() > 1 || existingCodes.Contains(g.Key))
            .Select(g => g.First())
            .ToList();
        if (duplicates.Count > 0)
            return BadRequest(new
            {
                message = $"Duplicate item code(s): {string.Join(", ", duplicates)}. Each item code must be unique within a catalogue."
            });

        // Descriptions must also be unique within a catalogue (the same item published
        // twice). Matched on a normalized form (case/space/punctuation-insensitive) so
        // "Basmati Rice 25kg" and "basmati rice 25 kg" collide.
        var existingDescriptions = catalogue.Lines
            .Select(l => NormalizeForMatch(l.Description))
            .ToHashSet();
        var duplicateDescriptions = request.Lines
            .Select(l => new { Raw = l.Description.Trim(), Key = NormalizeForMatch(l.Description) })
            .GroupBy(x => x.Key)
            .Where(g => !string.IsNullOrEmpty(g.Key) && (g.Count() > 1 || existingDescriptions.Contains(g.Key)))
            .Select(g => g.First().Raw)
            .ToList();
        if (duplicateDescriptions.Count > 0)
            return BadRequest(new
            {
                message = $"Duplicate description(s): {string.Join(", ", duplicateDescriptions)}. Each description must be unique within a catalogue."
            });

        var lines = request.Lines.Select(l => new CatalogueLine
        {
            Id = Guid.NewGuid(),
            ItemId = l.ItemId,
            ItemCode = l.ItemCode.Trim(),
            Description = l.Description.Trim(),
            PackUom = l.PackUom.Trim(),
            Price = l.Price,
            Currency = l.Currency.Trim().ToUpperInvariant(),
            ValidFrom = l.ValidFrom,
            ValidTo = l.ValidTo,
            TaxClass = l.TaxClass.Trim().ToUpperInvariant(),
            Status = CatalogueLineStatus.Draft,
        });

        var created = await _catRepo.AddLinesAsync(id, lines);
        return Ok(created);
    }

    [HttpDelete("{id:guid}/lines/{lineId:guid}")]
    public async Task<IActionResult> DeleteLine(Guid id, Guid lineId)
    {
        var catalogue = await _catRepo.GetByIdAsync(id);
        if (catalogue is null) return NotFound();
        if (!User.CanAccessVendor(catalogue.VendorId)) return Forbid();
        if (catalogue.Status != CatalogueStatus.Draft)
            return BadRequest(new { message = "Lines can only be removed while the catalogue is in Draft status." });

        var removed = await _catRepo.DeleteLineAsync(id, lineId);
        if (!removed) return NotFound(new { message = "Line not found in this catalogue." });
        return NoContent();
    }

    [HttpPut("{id:guid}/submit")]
    public async Task<IActionResult> Submit(Guid id)
    {
        var catalogue = await _catRepo.GetByIdAsync(id);
        if (catalogue is null) return NotFound();
        if (!User.CanAccessVendor(catalogue.VendorId)) return Forbid();

        catalogue.Status = CatalogueStatus.Submitted;
        catalogue.SubmittedDate = DateTime.UtcNow;
        catalogue.UpdatedAt = DateTime.UtcNow;
        var updated = await _catRepo.UpdateAsync(catalogue);
        return Ok(updated);
    }

    [HttpPut("{id:guid}/approve")]
    [Authorize(Policy = "InternalOnly")]
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
    [Authorize(Policy = "InternalOnly")]
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

    /// <summary>Lowercases and strips everything but letters/digits, so descriptions
    /// that differ only by case, spacing or punctuation are treated as the same.</summary>
    private static string NormalizeForMatch(string? value) =>
        System.Text.RegularExpressions.Regex.Replace((value ?? string.Empty).ToLowerInvariant(), "[^a-z0-9]", "");
}

public class RejectRequest { public string Reason { get; set; } = string.Empty; }

public class CatalogueReviewDto
{
    public Guid Id { get; set; }
    public Guid VendorId { get; set; }
    public string SupplierName { get; set; } = string.Empty;
    public string VersionLabel { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime? SubmittedDate { get; set; }
    public int LineCount { get; set; }
    public List<CatalogueReviewLineDto> Lines { get; set; } = new();
}

public class CatalogueReviewLineDto
{
    public string ItemCode { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string PackUom { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public string Currency { get; set; } = "INR";
    public decimal? ContractPrice { get; set; }
    public decimal? DeviationPercent { get; set; }
    /// <summary>The Web Prol'IFIC master item this line is mapped to (null = unmapped).</summary>
    public Guid? MappedItemId { get; set; }
    public string? MappedItemCode { get; set; }
    public string? MappedItemDescription { get; set; }
}

public class CreateCatalogueRequest
{
    public Guid VendorId { get; set; }
    public Guid BuyingEntityId { get; set; }
}

public class CatalogueLineInput
{
    /// <summary>Optional link to a Web Prol'IFIC master item this line maps to.</summary>
    public Guid? ItemId { get; set; }
    public string ItemCode { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string PackUom { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public string Currency { get; set; } = string.Empty;
    public DateTime ValidFrom { get; set; }
    public DateTime ValidTo { get; set; }
    public string TaxClass { get; set; } = string.Empty;
}

public class AddCatalogueLinesRequest
{
    public List<CatalogueLineInput> Lines { get; set; } = new();
}
