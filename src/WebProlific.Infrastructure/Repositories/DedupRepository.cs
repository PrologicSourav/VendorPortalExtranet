using Microsoft.EntityFrameworkCore;
using WebProlific.Core.Entities;
using WebProlific.Core.Interfaces;
using WebProlific.Infrastructure.Data;

namespace WebProlific.Infrastructure.Repositories;

public class DedupRepository : IDedupRepository
{
    private readonly AppDbContext _db;

    public DedupRepository(AppDbContext db) => _db = db;

    // Vendor dedup
    public async Task<IEnumerable<VendorDedupCluster>> GetVendorClustersAsync(string? status)
    {
        var query = _db.VendorDedupClusters
            .Include(c => c.Candidates).ThenInclude(c => c.Vendor)
            .AsQueryable();

        if (!string.IsNullOrEmpty(status) && Enum.TryParse<DedupStatus>(status, true, out var dedupStatus))
            query = query.Where(c => c.Status == dedupStatus);

        return await query.OrderByDescending(c => c.CreatedAt).ToListAsync();
    }

    public async Task<VendorDedupCluster?> GetVendorClusterByIdAsync(Guid id) =>
        await _db.VendorDedupClusters
            .Include(c => c.Candidates).ThenInclude(c => c.Vendor)
            .FirstOrDefaultAsync(c => c.Id == id);

    public async Task<VendorDedupCluster> CreateVendorClusterAsync(VendorDedupCluster cluster)
    {
        _db.VendorDedupClusters.Add(cluster);
        await _db.SaveChangesAsync();
        return cluster;
    }

    public async Task<VendorDedupCluster> UpdateVendorClusterAsync(VendorDedupCluster cluster)
    {
        _db.VendorDedupClusters.Update(cluster);
        await _db.SaveChangesAsync();
        return cluster;
    }

    // Item dedup
    public async Task<IEnumerable<ItemDedupCluster>> GetItemClustersAsync(string? status, string? category)
    {
        var query = _db.ItemDedupClusters
            .Include(c => c.Candidates).ThenInclude(c => c.Item)
            .AsQueryable();

        if (!string.IsNullOrEmpty(status) && Enum.TryParse<ItemDedupStatus>(status, true, out var itemDedupStatus))
            query = query.Where(c => c.Status == itemDedupStatus);

        return await query.OrderByDescending(c => c.CreatedAt).ToListAsync();
    }

    public async Task<ItemDedupCluster?> GetItemClusterByIdAsync(Guid id) =>
        await _db.ItemDedupClusters
            .Include(c => c.Candidates).ThenInclude(c => c.Item)
            .FirstOrDefaultAsync(c => c.Id == id);

    public async Task<ItemDedupCluster> CreateItemClusterAsync(ItemDedupCluster cluster)
    {
        _db.ItemDedupClusters.Add(cluster);
        await _db.SaveChangesAsync();
        return cluster;
    }

    public async Task<ItemDedupCluster> UpdateItemClusterAsync(ItemDedupCluster cluster)
    {
        _db.ItemDedupClusters.Update(cluster);
        await _db.SaveChangesAsync();
        return cluster;
    }
}
