using Microsoft.AspNetCore.Mvc;
using WebProlific.Api.Extensions;
using WebProlific.Core.Entities;
using WebProlific.Core.Interfaces;

namespace WebProlific.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class NotificationsController : ControllerBase
{
    private readonly INotificationRepository _notifRepo;

    public NotificationsController(INotificationRepository notifRepo) => _notifRepo = notifRepo;

    [HttpGet("user/{userId:guid}")]
    public async Task<IActionResult> GetByUser(Guid userId, [FromQuery] bool? unreadOnly)
    {
        if (User.GetUserId() != userId) return Forbid();

        var notifications = await _notifRepo.GetByUserAsync(userId, unreadOnly);
        var unreadCount = await _notifRepo.GetUnreadCountAsync(userId);
        return Ok(new { items = notifications, unreadCount });
    }

    [HttpPut("user/{userId:guid}/mark-all-read")]
    public async Task<IActionResult> MarkAllRead(Guid userId)
    {
        if (User.GetUserId() != userId) return Forbid();

        await _notifRepo.MarkAllReadAsync(userId);
        return Ok(new { message = "All notifications marked as read" });
    }

    [HttpPut("{notificationId:guid}/mark-read")]
    public async Task<IActionResult> MarkAsRead(Guid notificationId)
    {
        var notification = await _notifRepo.GetByIdAsync(notificationId);
        if (notification is null) return NotFound();
        if (User.GetUserId() != notification.UserId) return Forbid();

        await _notifRepo.MarkAsReadAsync(notificationId);
        return Ok(new { message = "Notification marked as read" });
    }
}
