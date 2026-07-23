namespace WebProlific.Core.Entities;

public class Catalogue
{
    public Guid Id { get; set; }
    public Guid VendorId { get; set; }
    public Guid BuyingEntityId { get; set; }
    public string VersionLabel { get; set; } = "v1";
    public CatalogueStatus Status { get; set; } = CatalogueStatus.Draft;
    // Nullable like ApprovedDate — a Draft catalogue hasn't been submitted yet, so it
    // has no submission date. Was previously non-nullable, which crashed reads of any
    // pre-existing Draft row (seed data never set this column).
    public DateTime? SubmittedDate { get; set; }
    public DateTime? ApprovedDate { get; set; }
    public string? RejectionReason { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Vendor Vendor { get; set; } = null!;
    public BuyingEntity BuyingEntity { get; set; } = null!;
    public ICollection<CatalogueLine> Lines { get; set; } = new List<CatalogueLine>();
}

public class CatalogueLine
{
    public Guid Id { get; set; }
    public Guid CatalogueId { get; set; }
    public Guid? ItemId { get; set; }
    public string ItemCode { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string PackUom { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public string Currency { get; set; } = "INR";
    public DateTime ValidFrom { get; set; }
    public DateTime ValidTo { get; set; }
    public string TaxClass { get; set; } = string.Empty;
    public CatalogueLineStatus Status { get; set; } = CatalogueLineStatus.Draft;
    public decimal? ContractPrice { get; set; }
    public decimal? DeviationPercent { get; set; }

    // Navigation
    public Catalogue Catalogue { get; set; } = null!;
    public Item? Item { get; set; }
}
