using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using WebProlific.Core.Entities;
using WebProlific.Infrastructure.Data;

namespace WebProlific.Infrastructure.WishIntegration;

public class WishSyncSummary
{
    public int VendorsMatched { get; set; }
    public int Created { get; set; }
    public int Updated { get; set; }
    public int Skipped { get; set; }
}

/// <summary>
/// Pulls printed, still-open Purchase Orders for each Vendor Portal vendor from
/// Web Prol'IFIC (matched by GSTIN/PAN) and upserts them into this system's own
/// PurchaseOrders/PurchaseOrderLines tables. Never writes to WISH — see
/// WishPurchaseOrderReader, which only ever issues SELECTs.
///
/// Re-running is safe: an existing synced PO (matched by SourceSystem+SourcePoNumber)
/// has its WISH-authoritative fields (remarks/instructions/currency/total, and each
/// line's description/qty-ordered/price) refreshed, but its Status and each line's
/// QtyDelivered are never touched after creation — those reflect the vendor's own
/// response and the portal's own delivery-note receiving flow, and must survive
/// re-syncs untouched.
/// </summary>
public class WishPoSyncService
{
    private readonly AppDbContext _db;
    private readonly WishPurchaseOrderReader _wish;
    private readonly ILogger<WishPoSyncService> _logger;

    public WishPoSyncService(AppDbContext db, WishPurchaseOrderReader wish, ILogger<WishPoSyncService> logger)
    {
        _db = db;
        _wish = wish;
        _logger = logger;
    }

    public async Task<WishSyncSummary> RunAsync(CancellationToken ct = default)
    {
        var summary = new WishSyncSummary();
        if (!_wish.IsConfigured)
        {
            _logger.LogInformation("WISH sync skipped: ConnectionStrings:WishConnection is not configured.");
            return summary;
        }

        // Relationship-level ids are the precise, per-chain/property source (WISH
        // vendor records are property-scoped, so the same real-world vendor can
        // have a different vendor_id per relationship) — see VendorRelationship
        // .ExternalVendorId. Grouped up front rather than queried per vendor.
        var relationshipIdsByVendor = (await _db.VendorRelationships
                .Where(r => r.Status == VendorRelationshipStatus.Active && r.ExternalVendorId != null && r.ExternalVendorId != "")
                .Select(r => new { r.VendorId, r.ExternalVendorId })
                .ToListAsync(ct))
            .GroupBy(r => r.VendorId)
            .ToDictionary(g => g.Key, g => g.Select(r => r.ExternalVendorId!.Trim()).Distinct().ToList());

        var vendors = await _db.Vendors
            .Where(v =>
                (v.WishVendorId != null && v.WishVendorId != "") ||
                (v.Gstin != null && v.Gstin != "") ||
                (v.Pan != null && v.Pan != "") ||
                relationshipIdsByVendor.Keys.Contains(v.Id))
            .ToListAsync(ct);

        var mappedProperties = await _db.Properties
            .Where(p => p.WishPropertyId != null && p.WishPropertyId != "")
            .ToListAsync(ct);

        foreach (var vendor in vendors)
        {
            // Relationship-level ids first (the precise source), unioned with the
            // older single-value Vendor.WishVendorId for vendors not yet migrated
            // to per-relationship mapping. WISH's own GSTIN/PAN fallback only
            // kicks in when neither explicit source has anything at all.
            var explicitIds = relationshipIdsByVendor.TryGetValue(vendor.Id, out var relIds)
                ? new List<string>(relIds)
                : new List<string>();
            if (!string.IsNullOrWhiteSpace(vendor.WishVendorId) && !explicitIds.Contains(vendor.WishVendorId.Trim()))
                explicitIds.Add(vendor.WishVendorId.Trim());

            var wishVendorIds = explicitIds.Count > 0
                ? explicitIds
                : await _wish.FindVendorIdsAsync(vendor.Gstin, vendor.Pan);
            if (wishVendorIds.Count == 0) continue;

            summary.VendorsMatched++;

            var headers = await _wish.GetPrintedOpenPurchaseOrdersAsync(wishVendorIds);
            foreach (var header in headers)
            {
                header.Lines = await _wish.GetPurchaseOrderLinesAsync(
                    header.PoNumber, header.PoDate, header.AmdNumber, header.PropertyId);

                var outcome = await UpsertAsync(vendor, header, mappedProperties, ct);
                switch (outcome)
                {
                    case UpsertOutcome.Created: summary.Created++; break;
                    case UpsertOutcome.Updated: summary.Updated++; break;
                    case UpsertOutcome.Skipped: summary.Skipped++; break;
                }
            }
        }

        await _db.SaveChangesAsync(ct);
        _logger.LogInformation(
            "WISH sync complete: {VendorsMatched} vendor(s) matched, {Created} PO(s) created, {Updated} updated, {Skipped} skipped.",
            summary.VendorsMatched, summary.Created, summary.Updated, summary.Skipped);
        return summary;
    }

    private enum UpsertOutcome { Created, Updated, Skipped }

    private async Task<UpsertOutcome> UpsertAsync(
        Vendor vendor, WishPoHeader header, List<Property> mappedProperties, CancellationToken ct)
    {
        var existing = await _db.PurchaseOrders
            .Include(po => po.Lines)
            .FirstOrDefaultAsync(po => po.SourceSystem == "WISH" && po.SourcePoNumber == header.SourceKey, ct);

        var property = mappedProperties.FirstOrDefault(p => p.WishPropertyId == header.PropertyId);
        var totalValue = header.FinalAmount > 0 ? header.FinalAmount : header.TotalAmount;
        var currency = string.IsNullOrWhiteSpace(header.FxCode) ? null : header.FxCode!.Trim();

        if (existing is null)
        {
            var buyingEntityId = property?.BuyingEntityId ?? await GetDefaultBuyingEntityIdAsync(ct);
            if (buyingEntityId is null)
            {
                _logger.LogWarning(
                    "Skipping WISH PO {SourceKey}: no active buying entity to attach it to.", header.SourceKey);
                return UpsertOutcome.Skipped;
            }

            var po = new PurchaseOrder
            {
                Id = Guid.NewGuid(),
                PoNumber = $"WISH-{header.PoNumber}-{header.AmdNumber}",
                VendorId = vendor.Id,
                BuyingEntityId = buyingEntityId.Value,
                PropertyId = property?.Id,
                OrderDate = header.CreatedOn ?? header.PoDate,
                // WISH's header has no distinct "required by" date; the PO date is the
                // closest available signal until a real mapping is identified.
                RequiredByDate = header.PoDate,
                TotalValue = totalValue,
                Currency = currency ?? "INR",
                Status = PoStatus.New,
                Remarks = header.Remarks,
                DispatchInstructions = header.DespatchInstructions,
                PackingInstructions = header.PackingInstructions,
                SourceSystem = "WISH",
                SourcePoNumber = header.SourceKey,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };

            foreach (var line in header.Lines)
            {
                po.Lines.Add(new PurchaseOrderLine
                {
                    Id = Guid.NewGuid(),
                    ItemDescription = line.ItemDescription,
                    QtyOrdered = line.QtyOrdered,
                    // Seeded from WISH's own receiving figure on first import only —
                    // from here on the portal's delivery-note flow owns this value.
                    QtyDelivered = line.QtyRecvd,
                    Uom = line.UnitId ?? "",
                    UnitPrice = line.EffectiveUnitPrice,
                    LineTotal = line.TotAmount,
                    TaxClass = line.ItemVatClass,
                    SourceLineId = line.ItemSeqId.ToString(),
                });
            }

            _db.PurchaseOrders.Add(po);
            return UpsertOutcome.Created;
        }

        // Refresh WISH-authoritative fields only. Status/AcknowledgmentReason reflect
        // the vendor's own response in the portal — never overwritten by a re-sync.
        existing.Remarks = header.Remarks;
        existing.DispatchInstructions = header.DespatchInstructions;
        existing.PackingInstructions = header.PackingInstructions;
        existing.TotalValue = totalValue;
        if (currency is not null) existing.Currency = currency;
        if (property is not null) existing.PropertyId = property.Id;
        existing.UpdatedAt = DateTime.UtcNow;

        foreach (var line in header.Lines)
        {
            var existingLine = existing.Lines.FirstOrDefault(l => l.SourceLineId == line.ItemSeqId.ToString());
            if (existingLine is null)
            {
                existing.Lines.Add(new PurchaseOrderLine
                {
                    Id = Guid.NewGuid(),
                    ItemDescription = line.ItemDescription,
                    QtyOrdered = line.QtyOrdered,
                    QtyDelivered = line.QtyRecvd,
                    Uom = line.UnitId ?? "",
                    UnitPrice = line.EffectiveUnitPrice,
                    LineTotal = line.TotAmount,
                    TaxClass = line.ItemVatClass,
                    SourceLineId = line.ItemSeqId.ToString(),
                });
                continue;
            }

            // WISH-authoritative; QtyDelivered is deliberately excluded — the portal's
            // own delivery-note receiving flow owns it once a line exists here.
            existingLine.ItemDescription = line.ItemDescription;
            existingLine.QtyOrdered = line.QtyOrdered;
            existingLine.Uom = line.UnitId ?? existingLine.Uom;
            existingLine.UnitPrice = line.EffectiveUnitPrice;
            existingLine.LineTotal = line.TotAmount;
            existingLine.TaxClass = line.ItemVatClass;
        }

        return UpsertOutcome.Updated;
    }

    private async Task<Guid?> GetDefaultBuyingEntityIdAsync(CancellationToken ct) =>
        await _db.BuyingEntities
            .Where(b => b.IsActive)
            .OrderBy(b => b.Name)
            .Select(b => (Guid?)b.Id)
            .FirstOrDefaultAsync(ct);
}
