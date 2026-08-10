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

    public async Task<IEnumerable<PurchaseOrder>> GetByVendorAsync(Guid vendorId, string? status, Guid? propertyId, int page, int pageSize)
    {
        var query = _db.PurchaseOrders
            .Include(po => po.BuyingEntity)
            .Include(po => po.Property)
            .Include(po => po.Lines)
            .Where(po => po.VendorId == vendorId);

        if (!string.IsNullOrEmpty(status) && Enum.TryParse<PoStatus>(status, true, out var poStatus))
            query = query.Where(po => po.Status == poStatus);

        if (propertyId.HasValue)
            query = query.Where(po => po.PropertyId == propertyId.Value);

        var ordered = query.OrderByDescending(po => po.OrderDate);
        // Page 1 uses TOP (SELECT TOP n) rather than OFFSET/FETCH, which the SQL
        // Server 2008 R2 engine does not support. Deeper pages still use OFFSET
        // (fine on SQL 2012+); the UI only ever requests page 1 today.
        IQueryable<PurchaseOrder> paged = page > 1
            ? ordered.Skip((page - 1) * pageSize)
            : ordered;
        return await paged.Take(pageSize).ToListAsync();
    }

    public async Task<int> GetVendorPoCountAsync(Guid vendorId, string? status, Guid? propertyId)
    {
        var query = _db.PurchaseOrders.Where(po => po.VendorId == vendorId);

        if (!string.IsNullOrEmpty(status) && Enum.TryParse<PoStatus>(status, true, out var poStatus))
            query = query.Where(po => po.Status == poStatus);

        if (propertyId.HasValue)
            query = query.Where(po => po.PropertyId == propertyId.Value);

        return await query.CountAsync();
    }

    public async Task<IEnumerable<Property>> GetPropertiesForVendorAsync(Guid vendorId)
    {
        // A plain join translates to a normal SQL JOIN; a two-step materialize-then-
        // List<Guid>.Contains() would have EF Core 8 emit an OPENJSON-based IN clause,
        // which the local SQL Server 2008 R2 dev instance doesn't support.
        return await _db.PurchaseOrders
            .Where(po => po.VendorId == vendorId && po.PropertyId.HasValue)
            .Select(po => po.Property!)
            .Distinct()
            .OrderBy(p => p.Name)
            .ToListAsync();
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
