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

    public async Task<IEnumerable<Catalogue>> GetByStatusAsync(string? status)
    {
        var query = _db.Catalogues
            .Include(c => c.Vendor)
            .Include(c => c.Lines)
            .AsQueryable();

        if (!string.IsNullOrEmpty(status) && Enum.TryParse<CatalogueStatus>(status, true, out var catStatus))
            query = query.Where(c => c.Status == catStatus);

        // Most recently submitted first (fall back to creation time for anything unsubmitted).
        return await query.OrderByDescending(c => c.SubmittedDate ?? c.CreatedAt).ToListAsync();
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

    public async Task<bool> DeleteLineAsync(Guid catalogueId, Guid lineId)
    {
        var line = await _db.CatalogueLines
            .FirstOrDefaultAsync(l => l.Id == lineId && l.CatalogueId == catalogueId);
        if (line is null) return false;
        _db.CatalogueLines.Remove(line);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<Guid?> GetDefaultBuyingEntityIdAsync() =>
        await _db.BuyingEntities
            .Where(b => b.IsActive)
            .OrderBy(b => b.Name)
            .Select(b => (Guid?)b.Id)
            .FirstOrDefaultAsync();
}
