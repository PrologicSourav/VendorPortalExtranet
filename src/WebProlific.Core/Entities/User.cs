namespace WebProlific.Core.Entities;

public class AppUser
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public UserRole Role { get; set; }
    public Guid? VendorId { get; set; } // null for internal users
    public bool IsInternal { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastLoginAt { get; set; }
    // New properties for internationalisation
    public string LanguageCode { get; set; } = "en"; // ISO language code, default English
    public string PreferredCurrencyCode { get; set; } = "INR"; // ISO currency code, default INR
}
