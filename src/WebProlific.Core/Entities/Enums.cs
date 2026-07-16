namespace WebProlific.Core.Entities;

// ─── Vendor / KYC ───────────────────────────────────────────
public enum KycStatus
{
    Incomplete,
    Validated,
    Expired,
    Blocked
}

public enum VendorStatus
{
    Active,
    Suspended,
    Merged
}

// ─── Catalogue ──────────────────────────────────────────────
public enum CatalogueStatus
{
    Draft,
    Submitted,
    Approved,
    Rejected
}

public enum CatalogueLineStatus
{
    Draft,
    Submitted,
    Approved,
    Rejected
}

// ─── Purchase Orders ────────────────────────────────────────
public enum PoStatus
{
    New,
    Acknowledged,
    PartiallyAccepted,
    UnableToSupply,
    Delivered
}

// ─── Delivery Notes / ASN ───────────────────────────────────
public enum DeliveryNoteStatus
{
    Draft,
    Submitted,
    Received
}

// ─── Invoices ───────────────────────────────────────────────
public enum InvoiceStatus
{
    Submitted,
    UnderReview,
    Approved,
    Blocked,
    Posted
}

public enum MatchStatus
{
    Matched,
    Mismatch
}

// ─── Payments ───────────────────────────────────────────────
public enum PaymentStatus
{
    Scheduled,
    Paid,
    Cancelled
}

// ─── Notifications ──────────────────────────────────────────
public enum NotificationType
{
    NewPo,
    DocumentRejected,
    PaymentReleased,
    CatalogueDecision
}

// ─── User / Roles ───────────────────────────────────────────
public enum UserRole
{
    SupplierCatalogue,
    SupplierOrders,
    SupplierFinance,
    SupplierAdmin,
    InternalKyc,
    InternalProcurement,
    InternalAp,
    InternalAdmin
}

public enum SupplierUserStatus
{
    Invited,
    Active,
    Suspended
}

// ─── Maker-Checker ──────────────────────────────────────────
public enum MakerCheckerStatus
{
    Pending,
    Approved,
    Rejected
}

// ─── Vendor Dedup ───────────────────────────────────────────
public enum DedupStatus
{
    Open,
    Merged,
    Dismissed
}

// ─── Item Dedup ─────────────────────────────────────────────
public enum ItemDedupStatus
{
    Open,
    Merged,
    Dismissed
}
