using Microsoft.EntityFrameworkCore;
using WebProlific.Core.Entities;
using WebProlific.Core.Interfaces;
using WebProlific.Infrastructure.Data;

namespace WebProlific.Infrastructure.Repositories;

public class MakerCheckerRepository : IMakerCheckerRepository
{
    private readonly AppDbContext _db;

    public MakerCheckerRepository(AppDbContext db) => _db = db;

    public async Task<IEnumerable<KycChangeRequest>> GetPendingAsync() =>
        await _db.KycChangeRequests
            .Include(kcr => kcr.Vendor)
            .Where(kcr => kcr.Status == MakerCheckerStatus.Pending)
            .OrderByDescending(kcr => kcr.RequestedDate)
            .ToListAsync();

    public async Task<KycChangeRequest?> GetByIdAsync(Guid id) =>
        await _db.KycChangeRequests
            .Include(kcr => kcr.Vendor)
            .FirstOrDefaultAsync(kcr => kcr.Id == id);

    public async Task<KycChangeRequest> CreateAsync(KycChangeRequest request)
    {
        _db.KycChangeRequests.Add(request);
        await _db.SaveChangesAsync();
        return request;
    }

    public async Task<KycChangeRequest> UpdateAsync(KycChangeRequest request)
    {
        _db.KycChangeRequests.Update(request);
        await _db.SaveChangesAsync();
        return request;
    }
}
