using Microsoft.EntityFrameworkCore;
using WebProlific.Core.Entities;
using WebProlific.Core.Interfaces;
using WebProlific.Infrastructure.Data;

namespace WebProlific.Infrastructure.Repositories;

public class RateContractRepository : IRateContractRepository
{
    private readonly AppDbContext _db;

    public RateContractRepository(AppDbContext db) => _db = db;

    public async Task<RateContract?> GetActiveForVendorAsync(Guid vendorId, Guid buyingEntityId) =>
        await _db.RateContracts
            .Include(rc => rc.Lines)
            .FirstOrDefaultAsync(rc =>
                rc.VendorId == vendorId &&
                rc.BuyingEntityId == buyingEntityId &&
                rc.ValidFrom <= DateTime.UtcNow &&
                rc.ValidTo >= DateTime.UtcNow);

    public async Task<decimal?> GetAgreedPriceAsync(Guid vendorId, Guid buyingEntityId, Guid itemId)
    {
        var rc = await GetActiveForVendorAsync(vendorId, buyingEntityId);
        return rc?.Lines.FirstOrDefault(l => l.ItemId == itemId)?.AgreedPrice;
    }
}
