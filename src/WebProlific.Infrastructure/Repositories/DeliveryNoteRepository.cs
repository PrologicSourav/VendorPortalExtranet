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
            .Include(dn => dn.PurchaseOrder)
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
}
