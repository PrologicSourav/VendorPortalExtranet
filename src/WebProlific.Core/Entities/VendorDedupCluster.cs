namespace WebProlific.Core.Entities;

public class VendorDedupCluster
{
    public Guid Id { get; set; }
    public DedupStatus Status { get; set; } = DedupStatus.Open;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ResolvedAt { get; set; }
    public Guid? MergedIntoVendorId { get; set; }

    // Navigation
    public ICollection<VendorDedupCandidate> Candidates { get; set; } = new List<VendorDedupCandidate>();
}

public class VendorDedupCandidate
{
    public Guid Id { get; set; }
    public Guid ClusterId { get; set; }
    public Guid VendorId { get; set; }
    public decimal SimilarityScore { get; set; }
    public string? MatchedAttributes { get; set; } // JSON: ["Same GSTIN", "Name 92%"]
    public bool IsSource { get; set; }

    // Navigation
    public VendorDedupCluster Cluster { get; set; } = null!;
    public Vendor Vendor { get; set; } = null!;
}
