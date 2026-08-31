namespace WebProlific.Core.Entities;

/// <summary>
/// The business relationship between a Vendor and a Chain (BuyingEntity) or a
/// specific Property under it. This is the layer that determines where a vendor
/// is actually allowed to transact — separate from KYC (which verifies the
/// vendor's legal identity once, globally) and separate from a vendor's own
/// PurchaseOrder history (which is a consequence of this relationship existing,
/// not the source of truth for it).
///
/// ScopeType.Chain with PropertyId == null means the vendor is approved for
/// every property under that BuyingEntity, not just the ones with an existing
/// row — no per-property duplication required.
/// </summary>
public class VendorRelationship
{
    public Guid Id { get; set; }
    public Guid VendorId { get; set; }
    public Guid BuyingEntityId { get; set; }
    public Guid? PropertyId { get; set; }
    public VendorRelationshipScope ScopeType { get; set; }
    public VendorRelationshipStatus Status { get; set; } = VendorRelationshipStatus.Active;
    public DateTime StartDate { get; set; } = DateTime.UtcNow;
    public DateTime? EndDate { get; set; }
    public Guid? CreatedByUserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public Guid? ModifiedByUserId { get; set; }
    public DateTime? ModifiedAt { get; set; }

    // WISH's own vendor_id for THIS specific chain/property — WISH vendor
    // records are property-scoped (OPM1.vendors.property_id), so the same
    // real-world vendor can have a different vendor_id per relationship. This
    // supersedes Vendor.WishVendorId (a single value that couldn't represent
    // more than one chain/property) as the preferred source for the WISH PO
    // sync; the old field is kept for backward compatibility and still used as
    // a fallback when a relationship has no id of its own.
    public string? ExternalVendorId { get; set; }

    public Vendor Vendor { get; set; } = null!;
    public BuyingEntity BuyingEntity { get; set; } = null!;
    public Property? Property { get; set; }
}
