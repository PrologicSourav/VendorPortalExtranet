using WebProlific.Core.Entities;
using WebProlific.Core.Interfaces;
using WebProlific.Infrastructure.Data;

namespace WebProlific.Infrastructure.Repositories;

public class AuditLogRepository : IAuditLogRepository
{
    private readonly AppDbContext _db;

    public AuditLogRepository(AppDbContext db) => _db = db;

    public async Task LogAsync(string eventType, Guid? vendorId, Guid? userId, string? details = null)
    {
        _db.AuditLogs.Add(new AuditLog
        {
            Id = Guid.NewGuid(),
            EventType = eventType,
            VendorId = vendorId,
            UserId = userId,
            Details = details,
            CreatedAt = DateTime.UtcNow,
        });
        await _db.SaveChangesAsync();
    }
}
