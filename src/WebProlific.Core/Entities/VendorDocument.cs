namespace WebProlific.Core.Entities;

public class VendorDocument
{
    public Guid Id { get; set; }
    public Guid VendorId { get; set; }
    public string DocumentType { get; set; } = string.Empty; // GST Certificate, PAN Card, MSME Certificate, etc.
    public string FileName { get; set; } = string.Empty;
    public string? FileUrl { get; set; }
    public DateTime UploadDate { get; set; } = DateTime.UtcNow;
    public DateTime? ExpiryDate { get; set; }
    public bool IsVerified { get; set; }

    public Vendor Vendor { get; set; } = null!;
}
