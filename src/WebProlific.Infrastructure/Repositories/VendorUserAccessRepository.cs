using Microsoft.EntityFrameworkCore;
using WebProlific.Core.Entities;
using WebProlific.Core.Interfaces;
using WebProlific.Infrastructure.Data;

namespace WebProlific.Infrastructure.Repositories;

public class VendorUserAccessRepository : IVendorUserAccessRepository
{
    private readonly AppDbContext _db;

    public VendorUserAccessRepository(AppDbContext db) => _db = db;

    public async Task<List<Guid>> GetGrantedRelationshipIdsAsync(Guid userId) =>
        await _db.VendorUserAccesses
            .Where(a => a.UserId == userId)
            .Select(a => a.VendorRelationshipId)
            .ToListAsync();

    public async Task ReplaceAsync(Guid userId, IEnumerable<Guid> relationshipIds, Guid? grantedByUserId)
    {
        var existing = await _db.VendorUserAccesses.Where(a => a.UserId == userId).ToListAsync();
        _db.VendorUserAccesses.RemoveRange(existing);

        foreach (var relationshipId in relationshipIds.Distinct())
        {
            _db.VendorUserAccesses.Add(new VendorUserAccess
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                VendorRelationshipId = relationshipId,
                CreatedByUserId = grantedByUserId,
                CreatedAt = DateTime.UtcNow,
            });
        }

        await _db.SaveChangesAsync();
    }
}
