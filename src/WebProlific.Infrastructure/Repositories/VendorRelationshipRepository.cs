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

    public async Task<bool> HasActiveAccessAsync(Guid vendorId, Guid buyingEntityId, Guid? propertyId)
    {
        var query = _db.VendorRelationships.Where(r =>
            r.VendorId == vendorId &&
            r.Status == VendorRelationshipStatus.Active &&
            r.BuyingEntityId == buyingEntityId);

        return await query.AnyAsync(r =>
            r.PropertyId == null || // chain-wide covers every property under it
            (propertyId != null && r.PropertyId == propertyId));
    }

    public async Task<IEnumerable<Property>> GetEffectivePropertiesAsync(Guid vendorId)
    {
        var active = await _db.VendorRelationships
            .Where(r => r.VendorId == vendorId && r.Status == VendorRelationshipStatus.Active)
            .ToListAsync();

        var directPropertyIds = active.Where(r => r.PropertyId != null).Select(r => r.PropertyId!.Value).ToList();
        var chainWideEntityIds = active.Where(r => r.PropertyId == null).Select(r => r.BuyingEntityId).ToList();

        return await _db.Properties
            .Where(p => p.IsActive && (directPropertyIds.Contains(p.Id) || chainWideEntityIds.Contains(p.BuyingEntityId)))
            .OrderBy(p => p.Name)
            .ToListAsync();
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
