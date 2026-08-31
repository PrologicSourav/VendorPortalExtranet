namespace WebProlific.Core.Entities;

/// <summary>
/// Restricts which of a vendor's own users can use which VendorRelationship
/// (chain/property context). Presence of a row grants access to that
/// relationship; absence denies it — but only once a user has at least one row
/// at all. A user with zero rows is unrestricted (sees everything their vendor
/// is entitled to), so adding this feature never silently locks out every
/// existing vendor user who was never explicitly scoped.
/// </summary>
public class VendorUserAccess
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid VendorRelationshipId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; set; }

    public AppUser User { get; set; } = null!;
    public VendorRelationship VendorRelationship { get; set; } = null!;
}
