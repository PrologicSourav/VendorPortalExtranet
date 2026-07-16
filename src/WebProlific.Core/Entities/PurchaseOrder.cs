namespace WebProlific.Core.Entities;

public class PurchaseOrder
{
    public Guid Id { get; set; }
    public string PoNumber { get; set; } = string.Empty;
    public Guid VendorId { get; set; }
    public Guid BuyingEntityId { get; set; }
    public Guid? PropertyId { get; set; }
    public DateTime OrderDate { get; set; }
    public DateTime RequiredByDate { get; set; }
    public decimal TotalValue { get; set; }
    public string Currency { get; set; } = "INR";
    public PoStatus Status { get; set; } = PoStatus.New;
    public string? AcknowledgmentReason { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Vendor Vendor { get; set; } = null!;
    public BuyingEntity BuyingEntity { get; set; } = null!;
    public Property? Property { get; set; }
    public ICollection<PurchaseOrderLine> Lines { get; set; } = new List<PurchaseOrderLine>();
    public ICollection<DeliveryNote> DeliveryNotes { get; set; } = new List<DeliveryNote>();
    public ICollection<Invoice> Invoices { get; set; } = new List<Invoice>();
}

public class PurchaseOrderLine
{
    public Guid Id { get; set; }
    public Guid PurchaseOrderId { get; set; }
    public Guid? ItemId { get; set; }
    public string ItemDescription { get; set; } = string.Empty;
    public decimal QtyOrdered { get; set; }
    public decimal QtyAccepted { get; set; }
    public decimal QtyDelivered { get; set; }
    public string Uom { get; set; } = string.Empty;
    public decimal UnitPrice { get; set; }
    public decimal LineTotal { get; set; }
    public string? AcceptanceReason { get; set; }

    // Navigation
    public PurchaseOrder PurchaseOrder { get; set; } = null!;
    public Item? Item { get; set; }
}
