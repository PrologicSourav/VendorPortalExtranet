using Microsoft.EntityFrameworkCore;
using WebProlific.Core.Entities;
using WebProlific.Core.Interfaces;
using WebProlific.Infrastructure.Data;

namespace WebProlific.Infrastructure.Repositories;

public class PurchaseOrderRepository : IPurchaseOrderRepository
{
    private readonly AppDbContext _db;

    public PurchaseOrderRepository(AppDbContext db) => _db = db;

    public async Task<PurchaseOrder?> GetByIdAsync(Guid id) =>
        await _db.PurchaseOrders
            .Include(po => po.Lines)
            .Include(po => po.Vendor)
            .Include(po => po.BuyingEntity)
            .Include(po => po.Property)
            .FirstOrDefaultAsync(po => po.Id == id);

    public async Task<PurchaseOrder?> GetByPoNumberAsync(string poNumber) =>
        await _db.PurchaseOrders.FirstOrDefaultAsync(po => po.PoNumber == poNumber);

    public async Task<IEnumerable<PurchaseOrder>> GetByVendorAsync(Guid vendorId, string? status, int page, int pageSize)
    {
        var query = _db.PurchaseOrders
            .Include(po => po.BuyingEntity)
            .Include(po => po.Property)
            .Where(po => po.VendorId == vendorId);

        if (!string.IsNullOrEmpty(status) && Enum.TryParse<PoStatus>(status, true, out var poStatus))
            query = query.Where(po => po.Status == poStatus);

        return await query
            .OrderByDescending(po => po.OrderDate)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
    }

    public async Task<int> GetVendorPoCountAsync(Guid vendorId, string? status)
    {
        var query = _db.PurchaseOrders.Where(po => po.VendorId == vendorId);

        if (!string.IsNullOrEmpty(status) && Enum.TryParse<PoStatus>(status, true, out var poStatus))
            query = query.Where(po => po.Status == poStatus);

        return await query.CountAsync();
    }

    public async Task<PurchaseOrder> CreateAsync(PurchaseOrder po)
    {
        _db.PurchaseOrders.Add(po);
        await _db.SaveChangesAsync();
        return po;
    }

    public async Task<PurchaseOrder> UpdateAsync(PurchaseOrder po)
    {
        _db.PurchaseOrders.Update(po);
        await _db.SaveChangesAsync();
        return po;
    }
}
