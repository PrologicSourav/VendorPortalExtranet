namespace WebProlific.Core.Entities;

/// <summary>
/// Append-only record of vendor access/onboarding events (relationship
/// created/revoked, request submitted/approved/rejected, etc). Scoped to the
/// vendor-relationship domain for now — not a general-purpose app-wide audit
/// trail.
/// </summary>
public class AuditLog
{
    public Guid Id { get; set; }
    public string EventType { get; set; } = string.Empty;
    public Guid? VendorId { get; set; }
    public Guid? UserId { get; set; }
    public string? Details { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
