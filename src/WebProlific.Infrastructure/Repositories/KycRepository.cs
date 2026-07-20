using Microsoft.EntityFrameworkCore;
using WebProlific.Core.Entities;
using WebProlific.Core.Interfaces;
using WebProlific.Infrastructure.Data;

namespace WebProlific.Infrastructure.Repositories;

public class KycRepository : IKycRepository
{
    private readonly AppDbContext _db;

    public KycRepository(AppDbContext db) => _db = db;

    public async Task<IEnumerable<Vendor>> GetKycQueueAsync(string? status, string? search, int page, int pageSize)
    {
        var query = _db.Vendors.AsQueryable();

        if (!string.IsNullOrEmpty(status) && Enum.TryParse<KycStatus>(status, true, out var kycStatus))
            query = query.Where(v => v.KycStatus == kycStatus);

        if (!string.IsNullOrEmpty(search))
            query = query.Where(v => v.LegalName.Contains(search) || 
                (v.Gstin != null && v.Gstin.Contains(search)));

        return await query
            .OrderByDescending(v => v.UpdatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
    }

    public async Task<int> GetKycQueueCountAsync(string? status, string? search)
    {
        var query = _db.Vendors.AsQueryable();

        if (!string.IsNullOrEmpty(status) && Enum.TryParse<KycStatus>(status, true, out var kycStatus))
            query = query.Where(v => v.KycStatus == kycStatus);

        if (!string.IsNullOrEmpty(search))
            query = query.Where(v => v.LegalName.Contains(search) || (v.Gstin != null && v.Gstin.Contains(search)));

        return await query.CountAsync();
    }

    public async Task<IEnumerable<VendorDocument>> GetDocumentsAsync(Guid vendorId) =>
        await _db.VendorDocuments.Where(d => d.VendorId == vendorId).ToListAsync();

    public async Task<VendorDocument> AddDocumentAsync(VendorDocument document)
    {
        _db.VendorDocuments.Add(document);
        await _db.SaveChangesAsync();
        return document;
    }
}
