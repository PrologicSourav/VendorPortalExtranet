using Microsoft.EntityFrameworkCore;
using WebProlific.Core.Entities;
using WebProlific.Core.Interfaces;
using WebProlific.Infrastructure.Data;

namespace WebProlific.Infrastructure.Repositories;

public class VendorRelationshipRepository : IVendorRelationshipRepository
{
    private readonly AppDbContext _db;

    public VendorRelationshipRepository(AppDbContext db) => _db = db;

    public async Task<IEnumerable<VendorRelationship>> GetByVendorAsync(Guid vendorId, VendorRelationshipStatus? status = null)
    {
        var query = _db.VendorRelationships
            .Include(r => r.BuyingEntity)
            .Include(r => r.Property)
            .Where(r => r.VendorId == vendorId);

        if (status.HasValue)
            query = query.Where(r => r.Status == status.Value);

        return await query.OrderBy(r => r.BuyingEntity.Name).ThenBy(r => r.Property != null ? r.Property.Name : "").ToListAsync();
    }

    public async Task<VendorRelationship?> GetByIdAsync(Guid id) =>
        await _db.VendorRelationships
            .Include(r => r.Vendor)
            .Include(r => r.BuyingEntity)
            .Include(r => r.Property)
            .FirstOrDefaultAsync(r => r.Id == id);

    public async Task<bool> HasActiveAccessAsync(Guid vendorId, Guid buyingEntityId, Guid? propertyId, Guid? userId = null)
    {
        var relationships = await GetEffectiveRelationshipsAsync(vendorId, userId);
        return relationships.Any(r =>
            r.BuyingEntityId == buyingEntityId &&
            (r.PropertyId == null || // chain-wide covers every property under it
             (propertyId != null && r.PropertyId == propertyId)));
    }

    public async Task<IEnumerable<Property>> GetEffectivePropertiesAsync(Guid vendorId, Guid? userId = null)
    {
        var relationships = await GetEffectiveRelationshipsAsync(vendorId, userId);

        var directPropertyIds = relationships.Where(r => r.PropertyId != null).Select(r => r.PropertyId!.Value).ToList();
        var chainWideEntityIds = relationships.Where(r => r.PropertyId == null).Select(r => r.BuyingEntityId).ToList();

        // EF.Constant forces these lists to inline as literal SQL values instead of
        // EF Core 8's default OPENJSON-based Contains() translation, which SQL Server
        // 2008 R2 (local dev engine) doesn't support — "Incorrect syntax near 'WITH'".
        return await _db.Properties
            .Where(p => p.IsActive && (EF.Constant(directPropertyIds).Contains(p.Id) || EF.Constant(chainWideEntityIds).Contains(p.BuyingEntityId)))
            .OrderBy(p => p.Name)
            .ToListAsync();
    }

    /// <summary>The vendor's Active relationships, narrowed to a specific user's
    /// VendorUserAccess grants when they have any — a user with zero grants is
    /// unrestricted and sees every relationship their vendor has.</summary>
    private async Task<List<VendorRelationship>> GetEffectiveRelationshipsAsync(Guid vendorId, Guid? userId)
    {
        var active = await _db.VendorRelationships
            .Where(r => r.VendorId == vendorId && r.Status == VendorRelationshipStatus.Active)
            .ToListAsync();

        if (userId is null) return active;

        var grantedIds = await _db.VendorUserAccesses
            .Where(a => a.UserId == userId.Value)
            .Select(a => a.VendorRelationshipId)
            .ToListAsync();

        if (grantedIds.Count == 0) return active;

        var granted = new HashSet<Guid>(grantedIds);
        return active.Where(r => granted.Contains(r.Id)).ToList();
    }

    public async Task<VendorRelationship> CreateAsync(VendorRelationship relationship)
    {
        _db.VendorRelationships.Add(relationship);
        await _db.SaveChangesAsync();
        return relationship;
    }

    public async Task<VendorRelationship> UpdateAsync(VendorRelationship relationship)
    {
        relationship.ModifiedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return relationship;
    }
}
