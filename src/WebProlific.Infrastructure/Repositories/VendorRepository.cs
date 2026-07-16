using Microsoft.EntityFrameworkCore;
using WebProlific.Core.Entities;
using WebProlific.Core.Interfaces;
using WebProlific.Infrastructure.Data;

namespace WebProlific.Infrastructure.Repositories;

public class VendorRepository : IVendorRepository
{
    private readonly AppDbContext _db;

    public VendorRepository(AppDbContext db) => _db = db;

    public async Task<Vendor?> GetByIdAsync(Guid id) =>
        await _db.Vendors.Include(v => v.Documents).FirstOrDefaultAsync(v => v.Id == id);

    public async Task<Vendor?> GetByGstinAsync(string gstin) =>
        await _db.Vendors.FirstOrDefaultAsync(v => v.Gstin == gstin);

    public async Task<IEnumerable<Vendor>> GetAllAsync(string? status, string? search, int page, int pageSize)
    {
        var query = _db.Vendors.AsQueryable();

        if (!string.IsNullOrEmpty(status) && Enum.TryParse<KycStatus>(status, true, out var kycStatus))
            query = query.Where(v => v.KycStatus == kycStatus);

        if (!string.IsNullOrEmpty(search))
            query = query.Where(v => v.LegalName.Contains(search) || v.Gstin.Contains(search));

        return await query
            .OrderByDescending(v => v.UpdatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
    }

    public async Task<int> GetCountAsync(string? status, string? search)
    {
        var query = _db.Vendors.AsQueryable();

        if (!string.IsNullOrEmpty(status) && Enum.TryParse<KycStatus>(status, true, out var kycStatus))
            query = query.Where(v => v.KycStatus == kycStatus);

        if (!string.IsNullOrEmpty(search))
            query = query.Where(v => v.LegalName.Contains(search) || v.Gstin.Contains(search));

        return await query.CountAsync();
    }

    public async Task<Vendor> CreateAsync(Vendor vendor)
    {
        _db.Vendors.Add(vendor);
        await _db.SaveChangesAsync();
        return vendor;
    }

    public async Task<Vendor> UpdateAsync(Vendor vendor)
    {
        _db.Vendors.Update(vendor);
        await _db.SaveChangesAsync();
        return vendor;
    }

    public async Task<bool> ExistsByGstinAsync(string gstin, Guid? excludeId = null)
    {
        return await _db.Vendors.AnyAsync(v => v.Gstin == gstin && (!excludeId.HasValue || v.Id != excludeId.Value));
    }
}
