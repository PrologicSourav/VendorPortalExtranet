namespace WebProlific.Infrastructure.WishIntegration;

/// <summary>A printed, still-open Purchase Order read from Web Prol'IFIC's own
/// database (invdb..purchase_orders / po_items) — the latest amendment only.</summary>
public class WishPoHeader
{
    public int PoNumber { get; set; }
    public DateTime PoDate { get; set; }
    public int AmdNumber { get; set; }
    public string PropertyId { get; set; } = string.Empty;
    public string VendorId { get; set; } = string.Empty;
    public string? Remarks { get; set; }
    public string? DespatchInstructions { get; set; }
    public string? PackingInstructions { get; set; }
    public string? FxCode { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal FinalAmount { get; set; }
    public DateTime? CreatedOn { get; set; }
    public List<WishPoLine> Lines { get; set; } = new();

    /// <summary>Stable composite key used to match this WISH PO back to a previously
    /// synced Vendor Portal row on re-sync (upsert, not duplicate).</summary>
    public string SourceKey =>
        $"{PoNumber}|{PoDate:yyyyMMdd}|{AmdNumber}|{PropertyId}";
}

public class WishPoLine
{
    public int ItemSeqId { get; set; }
    public string ItemDescription { get; set; } = string.Empty;
    public decimal QtyOrdered { get; set; }
    public string? UnitId { get; set; }
    public decimal ItemRate { get; set; }
    public decimal TotAmount { get; set; }
    public decimal QtyRecvd { get; set; }
    /// <summary>WISH's internal tax-class code (e.g. "GST3", "GST0") — an opaque
    /// category, not a literal percentage. Surfaced as-is since we have no access
    /// to WISH's tax-rate lookup table to translate it into a real GST slab.</summary>
    public string? ItemVatClass { get; set; }

    /// <summary>Effective per-unit price. WISH leaves item_rate at 0 for "charge"
    /// lines (freight, packing, etc. — charge_flag='Y') that only carry a lump-sum
    /// tot_amount, so fall back to tot_amount/qty_ordered rather than show ₹0.00
    /// next to a nonzero line total.</summary>
    public decimal EffectiveUnitPrice =>
        ItemRate > 0 ? ItemRate : (QtyOrdered > 0 ? Math.Round(TotAmount / QtyOrdered, 2) : 0);
}

/// <summary>One row from WISH's own vendor master (OPM1.vendors) — property-scoped,
/// so the same real-world company can appear multiple times with a different
/// vendor_id per property. Used to find WISH vendors not yet linked to any
/// VendorRelationship, for the governance "Unmapped Vendors" screen.</summary>
public class WishVendor
{
    public string VendorId { get; set; } = string.Empty;
    public string VendorName { get; set; } = string.Empty;
    public string PropertyId { get; set; } = string.Empty;
    public string? Gstin { get; set; }
    public string? Pan { get; set; }
}
