using Microsoft.EntityFrameworkCore;
using WebProlific.Core.Entities;
using WebProlific.Core.Interfaces;
using WebProlific.Infrastructure.Data;

namespace WebProlific.Infrastructure.Repositories;

public class NotificationRepository : INotificationRepository
{
    private readonly AppDbContext _db;

    public NotificationRepository(AppDbContext db) => _db = db;

    public async Task<Notification?> GetByIdAsync(Guid id) =>
        await _db.Notifications.FindAsync(id);

    public async Task<IEnumerable<Notification>> GetByUserAsync(Guid userId, bool? unreadOnly)
    {
        var query = _db.Notifications.Where(n => n.UserId == userId);

        if (unreadOnly == true)
            query = query.Where(n => !n.IsRead);

        return await query.OrderByDescending(n => n.CreatedAt).ToListAsync();
    }

    public async Task<int> GetUnreadCountAsync(Guid userId) =>
        await _db.Notifications.CountAsync(n => n.UserId == userId && !n.IsRead);

    public async Task MarkAllReadAsync(Guid userId)
    {
        var unread = await _db.Notifications.Where(n => n.UserId == userId && !n.IsRead).ToListAsync();
        foreach (var n in unread) n.IsRead = true;
        await _db.SaveChangesAsync();
    }

    public async Task MarkAsReadAsync(Guid notificationId)
    {
        var notif = await _db.Notifications.FindAsync(notificationId);
        if (notif != null && !notif.IsRead)
        {
            notif.IsRead = true;
            await _db.SaveChangesAsync();
        }
    }

    public async Task<Notification> CreateAsync(Notification notification)
    {
        _db.Notifications.Add(notification);
        await _db.SaveChangesAsync();
        return notification;
    }
}
