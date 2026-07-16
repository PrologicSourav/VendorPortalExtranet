namespace WebProlific.Core.Entities;

public class VendorUser
{
    public Guid Id { get; set; }
    public Guid VendorId { get; set; }
    public string ContactName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public UserRole Role { get; set; }
    public SupplierUserStatus Status { get; set; } = SupplierUserStatus.Invited;
    public string? ScopedEntities { get; set; } // JSON array of entity IDs
    public string? ScopedProperties { get; set; } // JSON array of property IDs
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Vendor Vendor { get; set; } = null!;
}
