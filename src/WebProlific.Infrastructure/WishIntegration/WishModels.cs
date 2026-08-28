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
}
