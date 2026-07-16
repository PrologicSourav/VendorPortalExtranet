namespace WebProlific.Core.Entities;

public class Payment
{
    public Guid Id { get; set; }
    public string PaymentReference { get; set; } = string.Empty;
    public Guid VendorId { get; set; }
    public Guid InvoiceId { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "INR";
    public PaymentStatus Status { get; set; } = PaymentStatus.Scheduled;
    public DateTime? ScheduledDate { get; set; }
    public DateTime? PaidDate { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Vendor Vendor { get; set; } = null!;
    public Invoice Invoice { get; set; } = null!;
}
