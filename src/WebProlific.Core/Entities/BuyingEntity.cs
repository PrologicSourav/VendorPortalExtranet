namespace WebProlific.Core.Entities;

public class BuyingEntity
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty; // e.g. "Accor — North India"
    public string Code { get; set; } = string.Empty;
    public string? Region { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // WISH's chain_id (menudb.OPM1.chains) — set by the WISH chain/property sync so
    // this "Chain" concept lines up with WISH's own, instead of being hand-entered.
    public string? WishChainId { get; set; }

    // Navigation
    public ICollection<PurchaseOrder> PurchaseOrders { get; set; } = new List<PurchaseOrder>();
    public ICollection<Property> Properties { get; set; } = new List<Property>();
}

public class Property
{
    public Guid Id { get; set; }
    public Guid BuyingEntityId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Code { get; set; }
    public string? City { get; set; }
    public bool IsActive { get; set; } = true;

    // WISH's property_id (e.g. "CCEHB") — set once by staff to link this Vendor
    // Portal property to its corresponding WISH property so synced POs land here
    // instead of an unmapped default. Null until mapped.
    public string? WishPropertyId { get; set; }

    public BuyingEntity BuyingEntity { get; set; } = null!;
}
