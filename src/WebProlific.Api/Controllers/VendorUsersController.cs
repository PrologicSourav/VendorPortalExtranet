using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebProlific.Api.Extensions;
using WebProlific.Core.Entities;
using WebProlific.Core.Interfaces;
using WebProlific.Infrastructure.Data;

namespace WebProlific.Api.Controllers;

/// <summary>
/// A vendor's own team: who can log in for this vendor, and — via
/// VendorUserAccess — which of the vendor's chain/property relationships each
/// person can actually see. Management is restricted to a SupplierAdmin of the
/// same vendor (or internal staff); a non-admin teammate can't change anyone's
/// access, including their own.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class VendorUsersController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IVendorRelationshipRepository _relationshipRepo;
    private readonly IVendorUserAccessRepository _accessRepo;
    private readonly IAuditLogRepository _auditLog;

    public VendorUsersController(
        AppDbContext db, IVendorRelationshipRepository relationshipRepo,
        IVendorUserAccessRepository accessRepo, IAuditLogRepository auditLog)
    {
        _db = db;
        _relationshipRepo = relationshipRepo;
        _accessRepo = accessRepo;
        _auditLog = auditLog;
    }

    [HttpGet("vendor/{vendorId:guid}")]
    public async Task<IActionResult> GetByVendor(Guid vendorId)
    {
        if (!User.CanAccessVendor(vendorId)) return Forbid();

        var users = await _db.Users.Where(u => u.VendorId == vendorId).OrderBy(u => u.DisplayName).ToListAsync();
        return Ok(users.Select(u => new
        {
            u.Id,
            u.Email,
            u.DisplayName,
            Role = u.Role.ToString(),
            u.IsActive,
            u.CreatedAt,
            u.LastLoginAt,
        }));
    }

    public class InviteUserRequest
    {
        public string Email { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        public string Role { get; set; } = "SupplierOrders";
        public string Password { get; set; } = string.Empty;
    }

    /// <summary>Adds a teammate to an existing vendor. In-app only for now — no
    /// outbound invitation email exists, so the admin shares the credentials
    /// directly (same as how a governance-created test account works today).</summary>
    [HttpPost("vendor/{vendorId:guid}")]
    public async Task<IActionResult> Invite(Guid vendorId, [FromBody] InviteUserRequest request)
    {
        if (!User.CanManageVendorTeam(vendorId)) return Forbid();

        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password) || string.IsNullOrWhiteSpace(request.DisplayName))
            return BadRequest(new { error = "Email, display name, and password are required." });

        if (request.Password.Length < 6)
            return BadRequest(new { error = "Password must be at least 6 characters." });

        if (!Enum.TryParse<UserRole>(request.Role, true, out var role) || !role.ToString().StartsWith("Supplier"))
            return BadRequest(new { error = "Role must be a supplier-side role." });

        if (await _db.Users.AnyAsync(u => u.Email == request.Email))
            return Conflict(new { error = "An account with this email already exists." });

        var user = new AppUser
        {
            Id = Guid.NewGuid(),
            Email = request.Email,
            DisplayName = request.DisplayName,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role = role,
            VendorId = vendorId,
            IsInternal = false,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
        };
        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        await _auditLog.LogAsync("VendorUserCreated", vendorId, User.GetUserId(), $"NewUserId={user.Id}, Email={request.Email}");

        return CreatedAtAction(nameof(GetByVendor), new { vendorId }, new
        {
            user.Id,
            user.Email,
            user.DisplayName,
            Role = user.Role.ToString(),
            user.IsActive,
        });
    }

    public class SetActiveRequest { public bool IsActive { get; set; } }

    [HttpPut("{userId:guid}/status")]
    public async Task<IActionResult> SetActive(Guid userId, [FromBody] SetActiveRequest request)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user is null || user.VendorId is null) return NotFound();
        if (!User.CanManageVendorTeam(user.VendorId.Value)) return Forbid();

        user.IsActive = request.IsActive;
        await _db.SaveChangesAsync();

        await _auditLog.LogAsync(request.IsActive ? "VendorUserEnabled" : "VendorUserDisabled", user.VendorId, User.GetUserId(), $"UserId={userId}");
        return Ok(new { user.Id, user.IsActive });
    }

    [HttpGet("{userId:guid}/access")]
    public async Task<IActionResult> GetAccess(Guid userId)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user is null || user.VendorId is null) return NotFound();
        if (!User.CanAccessVendor(user.VendorId.Value)) return Forbid();

        var granted = await _accessRepo.GetGrantedRelationshipIdsAsync(userId);
        return Ok(new { userId, unrestricted = granted.Count == 0, grantedRelationshipIds = granted });
    }

    /// <summary>Replaces this user's full set of granted relationships. An empty
    /// list means "unrestricted," not "no access" — see VendorUserAccess.</summary>
    [HttpPut("{userId:guid}/access")]
    public async Task<IActionResult> SetAccess(Guid userId, [FromBody] List<Guid> relationshipIds)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user is null || user.VendorId is null) return NotFound();
        if (!User.CanManageVendorTeam(user.VendorId.Value)) return Forbid();

        // Every relationship id must actually belong to this user's own vendor —
        // otherwise a crafted request could grant access to another vendor's
        // relationship id.
        var validIds = (await _relationshipRepo.GetByVendorAsync(user.VendorId.Value))
            .Select(r => r.Id)
            .ToHashSet();
        if (relationshipIds.Any(id => !validIds.Contains(id)))
            return BadRequest(new { error = "One or more relationship ids don't belong to this vendor." });

        await _accessRepo.ReplaceAsync(userId, relationshipIds, User.GetUserId());

        await _auditLog.LogAsync("VendorUserAccessChanged", user.VendorId, User.GetUserId(),
            $"UserId={userId}, GrantedCount={relationshipIds.Count}");

        return Ok(new { userId, unrestricted = relationshipIds.Count == 0, grantedRelationshipIds = relationshipIds });
    }
}
