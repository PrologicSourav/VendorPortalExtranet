using Microsoft.EntityFrameworkCore;
using WebProlific.Core.Entities;
using WebProlific.Core.Interfaces;
using WebProlific.Infrastructure.Data;

namespace WebProlific.Infrastructure.Repositories;

public class VendorRequestRepository : IVendorRequestRepository
{
    private readonly AppDbContext _db;

    public VendorRequestRepository(AppDbContext db) => _db = db;

    public async Task<IEnumerable<VendorRequest>> GetByVendorAsync(Guid vendorId) =>
        await _db.VendorRequests
            .Include(r => r.RequestedBuyingEntity)
            .Include(r => r.RequestedProperty)
            .Where(r => r.VendorId == vendorId)
            .OrderByDescending(r => r.RequestedDate)
            .ToListAsync();

    public async Task<IEnumerable<VendorRequest>> GetQueueAsync(VendorRequestStatus? status)
    {
        var query = _db.VendorRequests
            .Include(r => r.Vendor)
            .Include(r => r.RequestedBuyingEntity)
            .Include(r => r.RequestedProperty)
            .AsQueryable();

        query = status.HasValue
            ? query.Where(r => r.Status == status.Value)
            : query.Where(r => r.Status == VendorRequestStatus.Pending);

        return await query.OrderBy(r => r.RequestedDate).ToListAsync();
    }

    public async Task<VendorRequest?> GetByIdAsync(Guid id) =>
        await _db.VendorRequests
            .Include(r => r.Vendor)
            .Include(r => r.RequestedBuyingEntity)
            .Include(r => r.RequestedProperty)
            .FirstOrDefaultAsync(r => r.Id == id);

    public async Task<VendorRequest> CreateAsync(VendorRequest request)
    {
        _db.VendorRequests.Add(request);
        await _db.SaveChangesAsync();
        return request;
    }

    public async Task<VendorRequest> UpdateAsync(VendorRequest request)
    {
        await _db.SaveChangesAsync();
        return request;
    }
}
