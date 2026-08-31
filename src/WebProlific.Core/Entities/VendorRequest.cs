namespace WebProlific.Core.Entities;

/// <summary>
/// A vendor's request for access to a Chain or Property it does not yet have an
/// active VendorRelationship with (Flow C — "vendor wants to work with another
/// chain"). Approval creates the actual VendorRelationship; the vendor never
/// gets access merely by requesting it.
/// </summary>
public class VendorRequest
{
    public Guid Id { get; set; }
    public Guid VendorId { get; set; }
    public Guid RequestedBuyingEntityId { get; set; }
    public Guid? RequestedPropertyId { get; set; }
    public VendorRelationshipScope RequestType { get; set; }
    public VendorRequestStatus Status { get; set; } = VendorRequestStatus.Pending;
    public Guid RequestedByUserId { get; set; }
    public DateTime RequestedDate { get; set; } = DateTime.UtcNow;
    public Guid? ReviewedByUserId { get; set; }
    public DateTime? ReviewedDate { get; set; }
    public string? Remarks { get; set; }

    public Vendor Vendor { get; set; } = null!;
    public BuyingEntity RequestedBuyingEntity { get; set; } = null!;
    public Property? RequestedProperty { get; set; }
}
