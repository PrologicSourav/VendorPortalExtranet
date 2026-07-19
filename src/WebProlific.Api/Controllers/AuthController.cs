using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebProlific.Core.Entities;
using WebProlific.Core.Interfaces;
using WebProlific.Infrastructure.Data;

namespace WebProlific.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;

    public AuthController(AppDbContext db) => _db = db;

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        if (string.IsNullOrEmpty(request.Email) || string.IsNullOrEmpty(request.Password))
            return BadRequest(new { error = "Email and password are required" });

        // Look up real user from database by email
        var user = await _db.Users.FirstOrDefaultAsync(u =>
            u.Email == request.Email && u.IsActive);

        if (user == null)
            return Unauthorized(new { error = "Invalid credentials" });

        // In production: validate password hash here
        // For now, accept any password for seeded users

        return Ok(new
        {
            token = "mock-jwt-token",
            user = new
            {
                id = user.Id,
                email = user.Email,
                displayName = user.DisplayName,
                role = user.Role.ToString(),
                vendorId = user.VendorId,
                isInternal = user.IsInternal
            }
        });
    }

    [HttpPost("verify-otp")]
    public async Task<IActionResult> VerifyOtp([FromBody] OtpRequest request)
    {
        // Mock: any 6-digit code succeeds
        if (request.Otp?.Length != 6)
            return BadRequest(new { error = "Invalid OTP format" });

        return Ok(new { message = "OTP verified", token = "mock-jwt-token-otp-verified" });
    }

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        if (string.IsNullOrEmpty(request.Email))
            return BadRequest(new { error = "Email is required" });

        var user = await _db.Users.FirstOrDefaultAsync(u =>
            u.Email == request.Email && u.IsActive);

        // Always return success to avoid email enumeration
        return Ok(new { message = "If an account exists with this email, a reset link has been sent." });
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        if (string.IsNullOrEmpty(request.Email) || string.IsNullOrEmpty(request.Password) || string.IsNullOrEmpty(request.CompanyName))
            return BadRequest(new { error = "Email, password, and company name are required" });

        if (request.Password.Length < 6)
            return BadRequest(new { error = "Password must be at least 6 characters" });

        // Check if email already exists
        var existing = await _db.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
        if (existing != null)
            return Conflict(new { error = "An account with this email already exists" });

        // Create a new vendor
        var vendorId = Guid.NewGuid();
        var vendor = new Vendor
        {
            Id = vendorId,
            LegalName = request.CompanyName,
            Gstin = string.IsNullOrWhiteSpace(request.Gstin) ? null : request.Gstin,
            KycStatus = Core.Entities.KycStatus.Incomplete,
            Status = Core.Entities.VendorStatus.Active,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        _db.Vendors.Add(vendor);

        // Create the user account
        var userId = Guid.NewGuid();
        var user = new AppUser
        {
            Id = userId,
            Email = request.Email,
            DisplayName = request.DisplayName ?? request.CompanyName,
            PasswordHash = request.Password, // In production: hash this
            Role = Core.Entities.UserRole.SupplierAdmin,
            VendorId = vendorId,
            IsInternal = false,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
        };
        _db.Users.Add(user);

        await _db.SaveChangesAsync();

        return Ok(new
        {
            message = "Account created successfully. Please sign in.",
            user = new
            {
                id = user.Id,
                email = user.Email,
                displayName = user.DisplayName,
                role = user.Role.ToString(),
                vendorId = user.VendorId,
                isInternal = user.IsInternal
            }
        });
    }

    
}

public class LoginRequest { public string Email { get; set; } = string.Empty; public string Password { get; set; } = string.Empty; public bool RememberMe { get; set; } }
public class OtpRequest { public string Otp { get; set; } = string.Empty; }
public class ForgotPasswordRequest { public string Email { get; set; } = string.Empty; }
public class RegisterRequest { public string Email { get; set; } = string.Empty; public string Password { get; set; } = string.Empty; public string CompanyName { get; set; } = string.Empty; public string? DisplayName { get; set; } public string? Gstin { get; set; } }
