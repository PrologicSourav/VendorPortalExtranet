namespace WebProlific.Core.Entities;

public class DeliveryNote
{
    public Guid Id { get; set; }
    public string DeliveryNoteNumber { get; set; } = string.Empty;
    public Guid PurchaseOrderId { get; set; }
    public Guid VendorId { get; set; }
    public DateTime ExpectedDeliveryDate { get; set; }
    public string? TimeWindowStart { get; set; }
    public string? TimeWindowEnd { get; set; }
    public DeliveryNoteStatus Status { get; set; } = DeliveryNoteStatus.Draft;
    public string? SupportingDocumentUrl { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public PurchaseOrder PurchaseOrder { get; set; } = null!;
    public Vendor Vendor { get; set; } = null!;
    public ICollection<DeliveryNoteLine> Lines { get; set; } = new List<DeliveryNoteLine>();
}

public class DeliveryNoteLine
{
    public Guid Id { get; set; }
    public Guid DeliveryNoteId { get; set; }
    public string ItemDescription { get; set; } = string.Empty;
    public decimal QtyInDelivery { get; set; }
    public string? BatchLotNumber { get; set; }
    public DateTime? ExpiryDate { get; set; }

    // Navigation
    public DeliveryNote DeliveryNote { get; set; } = null!;
}
