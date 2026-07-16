namespace WebProlific.Core.Entities;

public class KycChangeRequest
{
    public Guid Id { get; set; }
    public Guid VendorId { get; set; }
    public string FieldChanged { get; set; } = string.Empty; // Bank account, GSTIN, Legal name
    public string OldValue { get; set; } = string.Empty;
    public string NewValue { get; set; } = string.Empty;
    public Guid RequestedByUserId { get; set; }
    public string RequestedBy { get; set; } = string.Empty;
    public DateTime RequestedDate { get; set; } = DateTime.UtcNow;
    public MakerCheckerStatus Status { get; set; } = MakerCheckerStatus.Pending;
    public Guid? ApprovedByUserId { get; set; }
    public string? ApprovedBy { get; set; }
    public DateTime? ActionDate { get; set; }
    public string? RejectionReason { get; set; }
    public string? SupportingDocumentUrl { get; set; }

    // Navigation
    public Vendor Vendor { get; set; } = null!;
}
