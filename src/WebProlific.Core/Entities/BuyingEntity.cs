namespace WebProlific.Core.Entities;

public class BuyingEntity
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty; // e.g. "Accor — North India"
    public string Code { get; set; } = string.Empty;
    public string? Region { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

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

    public BuyingEntity BuyingEntity { get; set; } = null!;
}
