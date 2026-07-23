using Microsoft.EntityFrameworkCore;
using WebProlific.Core.Entities;
using WebProlific.Core.Interfaces;
using WebProlific.Infrastructure.Data;

namespace WebProlific.Infrastructure.Repositories;

public class CatalogueRepository : ICatalogueRepository
{
    private readonly AppDbContext _db;

    public CatalogueRepository(AppDbContext db) => _db = db;

    public async Task<Catalogue?> GetByIdAsync(Guid id) =>
        await _db.Catalogues
            .Include(c => c.Lines)
            .Include(c => c.Vendor)
            .Include(c => c.BuyingEntity)
            .FirstOrDefaultAsync(c => c.Id == id);

    public async Task<IEnumerable<Catalogue>> GetByVendorAsync(Guid vendorId, string? status)
    {
        var query = _db.Catalogues
            .Include(c => c.BuyingEntity)
            .Include(c => c.Lines)
            .Where(c => c.VendorId == vendorId);

        if (!string.IsNullOrEmpty(status) && Enum.TryParse<CatalogueStatus>(status, true, out var catStatus))
            query = query.Where(c => c.Status == catStatus);

        return await query.OrderByDescending(c => c.CreatedAt).ToListAsync();
    }

    public async Task<Catalogue> CreateAsync(Catalogue catalogue)
    {
        _db.Catalogues.Add(catalogue);
        await _db.SaveChangesAsync();
        return catalogue;
    }

    public async Task<Catalogue> UpdateAsync(Catalogue catalogue)
    {
        _db.Catalogues.Update(catalogue);
        await _db.SaveChangesAsync();
        return catalogue;
    }

    public async Task<IEnumerable<CatalogueLine>> AddLinesAsync(Guid catalogueId, IEnumerable<CatalogueLine> lines)
    {
        var list = lines.ToList();
        foreach (var line in list)
        {
            line.CatalogueId = catalogueId;
        }
        _db.CatalogueLines.AddRange(list);
        await _db.SaveChangesAsync();
        return list;
    }

    public async Task<Guid?> GetDefaultBuyingEntityIdAsync() =>
        await _db.BuyingEntities
            .Where(b => b.IsActive)
            .OrderBy(b => b.Name)
            .Select(b => (Guid?)b.Id)
            .FirstOrDefaultAsync();
}
