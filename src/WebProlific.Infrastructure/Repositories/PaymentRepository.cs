using Microsoft.EntityFrameworkCore;
using WebProlific.Core.Entities;
using WebProlific.Core.Interfaces;
using WebProlific.Infrastructure.Data;

namespace WebProlific.Infrastructure.Repositories;

public class PaymentRepository : IPaymentRepository
{
    private readonly AppDbContext _db;

    public PaymentRepository(AppDbContext db) => _db = db;

    public async Task<IEnumerable<Payment>> GetByVendorAsync(Guid vendorId, string? status)
    {
        var query = _db.Payments
            .Include(p => p.Invoice)
            .Where(p => p.VendorId == vendorId);

        if (!string.IsNullOrEmpty(status) && Enum.TryParse<PaymentStatus>(status, true, out var payStatus))
            query = query.Where(p => p.Status == payStatus);

        return await query.OrderByDescending(p => p.CreatedAt).ToListAsync();
    }

    public async Task<Payment?> GetNextScheduledAsync(Guid vendorId) =>
        await _db.Payments
            .Where(p => p.VendorId == vendorId && p.Status == PaymentStatus.Scheduled)
            .OrderBy(p => p.ScheduledDate)
            .FirstOrDefaultAsync();

    public async Task<Payment> CreateAsync(Payment payment)
    {
        _db.Payments.Add(payment);
        await _db.SaveChangesAsync();
        return payment;
    }
}
