namespace WebProlific.Core.Entities;

public class RateContract
{
    public Guid Id { get; set; }
    public Guid VendorId { get; set; }
    public Guid BuyingEntityId { get; set; }
    public string ContractNumber { get; set; } = string.Empty;
    public DateTime ValidFrom { get; set; }
    public DateTime ValidTo { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Vendor Vendor { get; set; } = null!;
    public BuyingEntity BuyingEntity { get; set; } = null!;
    public ICollection<RateContractLine> Lines { get; set; } = new List<RateContractLine>();
}

public class RateContractLine
{
    public Guid Id { get; set; }
    public Guid RateContractId { get; set; }
    public Guid ItemId { get; set; }
    public decimal AgreedPrice { get; set; }
    public string Currency { get; set; } = "INR";

    // Navigation
    public RateContract RateContract { get; set; } = null!;
    public Item Item { get; set; } = null!;
}
