using Microsoft.EntityFrameworkCore;
using WebProlific.Core.Entities;
using WebProlific.Core.Interfaces;
using WebProlific.Infrastructure.Data;

namespace WebProlific.Infrastructure.Repositories;

public class InvoiceRepository : IInvoiceRepository
{
    private readonly AppDbContext _db;

    public InvoiceRepository(AppDbContext db) => _db = db;

    public async Task<Invoice?> GetByIdAsync(Guid id) =>
        await _db.Invoices
            .Include(inv => inv.Lines)
            .Include(inv => inv.Vendor)
            .Include(inv => inv.PurchaseOrder)
            .FirstOrDefaultAsync(inv => inv.Id == id);

    public async Task<IEnumerable<Invoice>> GetByVendorAsync(Guid vendorId, string? status, int page, int pageSize)
    {
        var query = _db.Invoices
            .Include(inv => inv.PurchaseOrder)
            .Where(inv => inv.VendorId == vendorId);

        if (!string.IsNullOrEmpty(status) && Enum.TryParse<InvoiceStatus>(status, true, out var invStatus))
            query = query.Where(inv => inv.Status == invStatus);

        // Page 1 uses TOP (not OFFSET/FETCH) for SQL Server 2008 R2 compatibility.
        var ordered = query.OrderByDescending(inv => inv.InvoiceDate);
        IQueryable<Invoice> paged = page > 1 ? ordered.Skip((page - 1) * pageSize) : ordered;
        return await paged
            .Take(pageSize)
            .ToListAsync();
    }

    public async Task<int> GetVendorInvoiceCountAsync(Guid vendorId, string? status)
    {
        var query = _db.Invoices.Where(inv => inv.VendorId == vendorId);

        if (!string.IsNullOrEmpty(status) && Enum.TryParse<InvoiceStatus>(status, true, out var invStatus))
            query = query.Where(inv => inv.Status == invStatus);

        return await query.CountAsync();
    }

    public async Task<Invoice> CreateAsync(Invoice invoice)
    {
        _db.Invoices.Add(invoice);
        await _db.SaveChangesAsync();
        return invoice;
    }

    public async Task<Invoice> UpdateAsync(Invoice invoice)
    {
        _db.Invoices.Update(invoice);
        await _db.SaveChangesAsync();
        return invoice;
    }
}
