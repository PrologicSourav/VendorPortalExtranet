namespace WebProlific.Core.Entities;

public class Invoice
{
    public Guid Id { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public Guid VendorId { get; set; }
    public Guid PurchaseOrderId { get; set; }
    public DateTime InvoiceDate { get; set; }
    public string Currency { get; set; } = "INR";
    public decimal SubTotal { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public InvoiceStatus Status { get; set; } = InvoiceStatus.Submitted;
    public MatchStatus MatchStatus { get; set; } = MatchStatus.Matched;
    public string? MismatchReasons { get; set; }
    public string? InvoicePdfUrl { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Vendor Vendor { get; set; } = null!;
    public PurchaseOrder PurchaseOrder { get; set; } = null!;
    public ICollection<InvoiceLine> Lines { get; set; } = new List<InvoiceLine>();
}

public class InvoiceLine
{
    public Guid Id { get; set; }
    public Guid InvoiceId { get; set; }
    public string ItemDescription { get; set; } = string.Empty;
    public decimal InvoicedQty { get; set; }
    public decimal InvoicedUnitPrice { get; set; }
    public decimal ExpectedQty { get; set; }
    public decimal ExpectedUnitPrice { get; set; }
    public decimal LineTotal { get; set; }

    // Navigation
    public Invoice Invoice { get; set; } = null!;
}
