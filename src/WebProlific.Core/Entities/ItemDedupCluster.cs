namespace WebProlific.Core.Entities;

public class ItemDedupCluster
{
    public Guid Id { get; set; }
    public ItemDedupStatus Status { get; set; } = ItemDedupStatus.Open;
    public string? ModelVersion { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ResolvedAt { get; set; }
    public Guid? MergedIntoItemId { get; set; }

    // Navigation
    public ICollection<ItemDedupCandidate> Candidates { get; set; } = new List<ItemDedupCandidate>();
}

public class ItemDedupCandidate
{
    public Guid Id { get; set; }
    public Guid ClusterId { get; set; }
    public Guid ItemId { get; set; }
    public decimal SimilarityScore { get; set; }
    public string? MatchedAttributes { get; set; } // JSON: ["Description", "Category", "UOM"]
    public bool IsSource { get; set; }

    // Navigation
    public ItemDedupCluster Cluster { get; set; } = null!;
    public Item Item { get; set; } = null!;
}
