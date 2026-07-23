using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using WebProlific.Api.Services;
using WebProlific.Core.Entities;
using WebProlific.Infrastructure.Data;

namespace WebProlific.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ITokenService _tokenService;
    private readonly ILogger<AuthController> _logger;

    public AuthController(AppDbContext db, ITokenService tokenService, ILogger<AuthController> logger)
    {
        _db = db;
        _tokenService = tokenService;
        _logger = logger;
    }

    /// <summary>
    /// Authenticate with email and password. Returns a JWT token and user profile.
    /// </summary>
    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        _logger.LogInformation("Login attempt for email: {Email}", request.Email);

        if (string.IsNullOrEmpty(request.Email) || string.IsNullOrEmpty(request.Password))
        {
            _logger.LogWarning("Login failed: Email or password missing");
            return BadRequest(new { error = "Email and password are required" });
        }

        var user = await _db.Users.FirstOrDefaultAsync(u =>
            u.Email == request.Email && u.IsActive);

        if (user == null)
        {
            _logger.LogWarning("Login failed: User not found for email: {Email}", request.Email);
            return Unauthorized(new { error = "Invalid credentials" });
        }

        // Verify password hash
        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            _logger.LogWarning("Login failed: Invalid password for user: {UserId}", user.Id);
            return Unauthorized(new { error = "Invalid credentials" });
        }

        // Update last login
        user.LastLoginAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        // Generate real JWT token
        var token = _tokenService.GenerateToken(user);

        _logger.LogInformation("User logged in successfully: {UserId} ({Email})", user.Id, user.Email);

        return Ok(new
        {
            token,
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

    /// <summary>
    /// Verify a 6-digit OTP code (second factor).
    /// </summary>
    [AllowAnonymous]
    [HttpPost("verify-otp")]
    public IActionResult VerifyOtp([FromBody] OtpRequest request)
    {
        _logger.LogInformation("OTP verification attempt");

        if (request.Otp?.Length != 6)
        {
            _logger.LogWarning("OTP verification failed: Invalid OTP format");
            return BadRequest(new { error = "Invalid OTP format" });
        }

        // For now, any 6-digit code succeeds
        // In production: validate against actual OTP sent via email/SMS
        _logger.LogInformation("OTP verified successfully");
        return Ok(new { message = "OTP verified", token = "otp-verified" });
    }

    /// <summary>
    /// Request a password reset link. Always returns success to prevent email enumeration.
    /// </summary>
    [AllowAnonymous]
    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        _logger.LogInformation("Password reset requested for email: {Email}", request.Email);

        if (string.IsNullOrEmpty(request.Email))
        {
            _logger.LogWarning("Password reset failed: Email is required");
            return BadRequest(new { error = "Email is required" });
        }

        var user = await _db.Users.FirstOrDefaultAsync(u =>
            u.Email == request.Email && u.IsActive);

        // In production: send actual reset email here

        // Always return success to avoid email enumeration
        _logger.LogInformation("Password reset processed for email: {Email} (user found: {UserExists})", 
            request.Email, user != null);
        return Ok(new { message = "If an account exists with this email, a reset link has been sent." });
    }

    /// <summary>
    /// Register a new supplier account (vendor + user).
    /// </summary>
    [AllowAnonymous]
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        _logger.LogInformation("Registration attempt for email: {Email}, company: {CompanyName}", 
            request.Email, request.CompanyName);

        if (string.IsNullOrEmpty(request.Email) || string.IsNullOrEmpty(request.Password) || string.IsNullOrEmpty(request.CompanyName))
        {
            _logger.LogWarning("Registration failed: Missing required fields (email, password, or company name)");
            return BadRequest(new { error = "Email, password, and company name are required" });
        }

        if (request.Password.Length < 6)
        {
            _logger.LogWarning("Registration failed: Password too short for email: {Email}", request.Email);
            return BadRequest(new { error = "Password must be at least 6 characters" });
        }

        // Check if email already exists
        var existing = await _db.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
        if (existing != null)
        {
            _logger.LogWarning("Registration failed: Email already exists: {Email}", request.Email);
            return Conflict(new { error = "An account with this email already exists" });
        }

        // Create a new vendor
        var vendorId = Guid.NewGuid();
        var vendor = new Vendor
        {
            Id = vendorId,
            LegalName = request.CompanyName,
            Gstin = string.IsNullOrWhiteSpace(request.Gstin) ? null : request.Gstin,
            KycStatus = KycStatus.Incomplete,
            Status = VendorStatus.Active,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        _db.Vendors.Add(vendor);

        // Save the vendor to get the ID in the database
        await _db.SaveChangesAsync();

        // Create the user account with a hashed password
        var userId = Guid.NewGuid();
        var user = new AppUser
        {
            Id = userId,
            Email = request.Email,
            DisplayName = request.DisplayName ?? request.CompanyName,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role = UserRole.SupplierAdmin,
            VendorId = vendorId,
            IsInternal = false,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
        };
        _db.Users.Add(user);

        await _db.SaveChangesAsync();

        _logger.LogInformation("User registered successfully: {UserId} ({Email}) for vendor {VendorId}", 
            userId, request.Email, vendorId);

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

    /// <summary>
    /// Get the currently authenticated user's profile from the JWT token.
    /// </summary>
    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> GetCurrentUser()
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized(new { error = "Invalid token" });

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId && u.IsActive);
        if (user == null)
            return Unauthorized(new { error = "User not found" });

        return Ok(new
        {
            id = user.Id,
            email = user.Email,
            displayName = user.DisplayName,
            role = user.Role.ToString(),
            vendorId = user.VendorId,
            isInternal = user.IsInternal
        });
    }

    /// <summary>
    /// Change the currently authenticated user's own password. Requires the
    /// current password for confirmation.
    /// </summary>
    [Authorize]
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized(new { error = "Invalid token" });

        if (string.IsNullOrWhiteSpace(request.CurrentPassword) || string.IsNullOrWhiteSpace(request.NewPassword))
            return BadRequest(new { message = "Current and new password are required." });

        if (request.NewPassword.Length < 6)
            return BadRequest(new { message = "New password must be at least 6 characters." });

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId && u.IsActive);
        if (user == null)
            return Unauthorized(new { error = "User not found" });

        if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
        {
            _logger.LogWarning("Change-password failed: incorrect current password for user {UserId}", userId);
            return BadRequest(new { message = "Current password is incorrect." });
        }

        if (BCrypt.Net.BCrypt.Verify(request.NewPassword, user.PasswordHash))
            return BadRequest(new { message = "New password must be different from the current password." });

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Password changed for user {UserId}", userId);
        return Ok(new { message = "Password changed successfully." });
    }
}

public class LoginRequest { public string Email { get; set; } = string.Empty; public string Password { get; set; } = string.Empty; public bool RememberMe { get; set; } }
public class OtpRequest { public string Otp { get; set; } = string.Empty; }
public class ForgotPasswordRequest { public string Email { get; set; } = string.Empty; }
public class ChangePasswordRequest { public string CurrentPassword { get; set; } = string.Empty; public string NewPassword { get; set; } = string.Empty; }
public class RegisterRequest { public string Email { get; set; } = string.Empty; public string Password { get; set; } = string.Empty; public string CompanyName { get; set; } = string.Empty; public string? DisplayName { get; set; } public string? Gstin { get; set; } }
