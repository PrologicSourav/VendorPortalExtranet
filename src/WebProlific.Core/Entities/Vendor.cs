namespace WebProlific.Core.Entities;

public class Vendor
{
    public Guid Id { get; set; }
    public string LegalName { get; set; } = string.Empty;
    public string? TradingName { get; set; }
    public string Gstin { get; set; } = string.Empty;
    public string? Pan { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? Pincode { get; set; }
    public string? Country { get; set; } = "India";
    public string? ContactEmail { get; set; }
    public string? ContactPhone { get; set; }
    public bool? IsMsme { get; set; }
    public string? UdyamNumber { get; set; }

    // KYC
    public KycStatus KycStatus { get; set; } = KycStatus.Incomplete;
    public DateTime? KycValidatedDate { get; set; }
    public DateTime? KycExpiryDate { get; set; }
    public string? KycMissingItems { get; set; }

    // Bank details
    public string? BankAccountNumber { get; set; }
    public string? BankIfsc { get; set; }
    public string? BankName { get; set; }
    public bool? BankDetailsPendingChecker { get; set; }

    public VendorStatus Status { get; set; } = VendorStatus.Active;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<VendorDocument> Documents { get; set; } = new List<VendorDocument>();
    public ICollection<VendorUser> Users { get; set; } = new List<VendorUser>();
    public ICollection<Catalogue> Catalogues { get; set; } = new List<Catalogue>();
    public ICollection<PurchaseOrder> PurchaseOrders { get; set; } = new List<PurchaseOrder>();
    public ICollection<Invoice> Invoices { get; set; } = new List<Invoice>();
}
