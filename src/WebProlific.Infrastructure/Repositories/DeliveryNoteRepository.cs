using Microsoft.EntityFrameworkCore;
using WebProlific.Core.Entities;
using WebProlific.Core.Interfaces;
using WebProlific.Infrastructure.Data;

namespace WebProlific.Infrastructure.Repositories;

public class DeliveryNoteRepository : IDeliveryNoteRepository
{
    private readonly AppDbContext _db;

    public DeliveryNoteRepository(AppDbContext db) => _db = db;

    public async Task<DeliveryNote?> GetByIdAsync(Guid id) =>
        await _db.DeliveryNotes
            .Include(dn => dn.Lines)
            // PurchaseOrder.Lines is needed (tracked, not just referenced) so
            // ReceiveAsync can credit QtyDelivered on the matching PO line.
            .Include(dn => dn.PurchaseOrder).ThenInclude(po => po.Lines)
            .Include(dn => dn.Vendor)
            .FirstOrDefaultAsync(dn => dn.Id == id);

    public async Task<IEnumerable<DeliveryNote>> GetByPurchaseOrderAsync(Guid poId) =>
        await _db.DeliveryNotes
            .Include(dn => dn.Lines)
            .Where(dn => dn.PurchaseOrderId == poId)
            .OrderByDescending(dn => dn.CreatedAt)
            .ToListAsync();

    public async Task<DeliveryNote> CreateAsync(DeliveryNote dn)
    {
        _db.DeliveryNotes.Add(dn);
        await _db.SaveChangesAsync();
        return dn;
    }

    public async Task<DeliveryNote> UpdateAsync(DeliveryNote dn)
    {
        _db.DeliveryNotes.Update(dn);
        await _db.SaveChangesAsync();
        return dn;
    }

    public async Task<IEnumerable<DeliveryNote>> SearchAsync(string? status, string? search, int page, int pageSize, Guid? propertyId = null)
    {
        var query = BuildSearchQuery(status, search, propertyId)
            .Include(dn => dn.Lines)
            .Include(dn => dn.PurchaseOrder)
            .Include(dn => dn.Vendor);

        var ordered = query.OrderByDescending(dn => dn.CreatedAt);
        IQueryable<DeliveryNote> paged = page > 1 ? ordered.Skip((page - 1) * pageSize) : ordered;
        return await paged.Take(pageSize).ToListAsync();
    }

    public async Task<int> SearchCountAsync(string? status, string? search, Guid? propertyId = null) =>
        await BuildSearchQuery(status, search, propertyId).CountAsync();

    private IQueryable<DeliveryNote> BuildSearchQuery(string? status, string? search, Guid? propertyId = null)
    {
        var query = _db.DeliveryNotes.AsQueryable();

        if (!string.IsNullOrEmpty(status) && Enum.TryParse<DeliveryNoteStatus>(status, true, out var dnStatus))
            query = query.Where(dn => dn.Status == dnStatus);

        if (!string.IsNullOrEmpty(search))
            query = query.Where(dn =>
                dn.DeliveryNoteNumber.Contains(search) ||
                dn.PurchaseOrder.PoNumber.Contains(search) ||
                dn.Vendor.LegalName.Contains(search));

        // DeliveryNote has no PropertyId of its own — derived from its PO.
        if (propertyId.HasValue)
            query = query.Where(dn => dn.PurchaseOrder.PropertyId == propertyId.Value);

        return query;
    }
}
