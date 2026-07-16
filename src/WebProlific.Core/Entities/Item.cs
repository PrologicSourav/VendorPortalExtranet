namespace WebProlific.Core.Entities;

public class Item
{
    public Guid Id { get; set; }
    public string ItemCode { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string NormalisedDescription { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string BaseUom { get; set; } = string.Empty;
    public string? PackSize { get; set; }
    public string? KeySpecs { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<CatalogueLine> CatalogueLines { get; set; } = new List<CatalogueLine>();
    public ICollection<PurchaseOrderLine> PurchaseOrderLines { get; set; } = new List<PurchaseOrderLine>();
}
