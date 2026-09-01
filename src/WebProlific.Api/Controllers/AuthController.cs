using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using WebProlific.Api.Services;
using WebProlific.Core.Entities;
using WebProlific.Infrastructure.Data;
using WebProlific.Infrastructure.WishIntegration;

namespace WebProlific.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ITokenService _tokenService;
    private readonly ILogger<AuthController> _logger;
    private readonly IConfiguration _config;
    private readonly WishUserValidator _wishUserValidator;

    public AuthController(AppDbContext db, ITokenService tokenService, ILogger<AuthController> logger, IConfiguration config, WishUserValidator wishUserValidator)
    {
        _db = db;
        _tokenService = tokenService;
        _logger = logger;
        _config = config;
        _wishUserValidator = wishUserValidator;
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
    /// Server-to-server handoff for WISH's "launch Governance Console" menu
    /// item: given a WISH-authenticated staff member's identity (read from
    /// WISHSESSION — never trust client-supplied claims about who this is),
    /// mints a governance JWT for their Vendor Portal internal account.
    ///
    /// Two independent checks gate this, both required:
    ///  1. The shared secret (Wish:GovernanceHandoffSecret) proves the caller
    ///     is WISH's own server, not an arbitrary client.
    ///  2. A live lookup against WISH's own tables (menudb.OPM1.vo_user /
    ///     vo_user_templates, via WishUserValidator) proves this specific
    ///     user_id is currently active in WISH and their assigned template
    ///     actually has an AIGOVC/INV114 grant — not just that the WISH menu
    ///     happened to show the item client-side.
    ///
    /// Auto-provisions an internal Vendor Portal account (IsInternal=true) the
    /// first time a given email passes both checks, so KYC/catalogue/etc.
    /// approvals still have a real User.Id to attribute to. If that account
    /// already exists but has been explicitly deactivated on the Vendor
    /// Portal side, that still blocks — deactivation is the one override an
    /// admin can apply after the fact, on top of WISH's own validation.
    /// </summary>
    [AllowAnonymous]
    [HttpPost("governance-handoff")]
    public async Task<IActionResult> GovernanceHandoff(
        [FromBody] GovernanceHandoffRequest request,
        [FromHeader(Name = "X-Wish-Shared-Secret")] string? sharedSecret)
    {
        var expectedSecret = _config["Wish:GovernanceHandoffSecret"];
        if (string.IsNullOrWhiteSpace(expectedSecret))
        {
            _logger.LogError("Governance handoff attempted but Wish:GovernanceHandoffSecret is not configured.");
            return StatusCode(503, new { error = "Governance handoff is not configured on this environment." });
        }

        if (string.IsNullOrWhiteSpace(sharedSecret) ||
            !CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(sharedSecret), Encoding.UTF8.GetBytes(expectedSecret)))
        {
            _logger.LogWarning("Governance handoff rejected: invalid shared secret.");
            return Unauthorized(new { error = "Invalid shared secret." });
        }

        if (string.IsNullOrWhiteSpace(request.Email))
            return BadRequest(new { error = "Email is required." });
        if (string.IsNullOrWhiteSpace(request.UserId))
            return BadRequest(new { error = "UserId is required." });

        var wishCheck = await _wishUserValidator.ValidateAsync(request.UserId, request.PropertyId, request.ChainId);
        if (!wishCheck.IsValid)
        {
            _logger.LogWarning("Governance handoff rejected by WISH validation for {UserId}: {Reason}", request.UserId, wishCheck.Reason);
            return Unauthorized(new { error = wishCheck.Reason ?? "WISH account validation failed." });
        }

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
        if (user is not null && !user.IsActive)
        {
            _logger.LogWarning("Governance handoff rejected: {Email} is deactivated.", request.Email);
            return Unauthorized(new { error = "This Vendor Portal account has been deactivated." });
        }

        if (user is null)
        {
            user = new AppUser
            {
                Id = Guid.NewGuid(),
                Email = request.Email,
                DisplayName = string.IsNullOrWhiteSpace(request.DisplayName) ? request.Email : request.DisplayName,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString()),
                Role = UserRole.InternalAdmin,
                IsInternal = true,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                LanguageCode = "en",
                PreferredCurrencyCode = "INR"
            };
            _db.Users.Add(user);
            await _db.SaveChangesAsync();
            _logger.LogInformation("Governance handoff auto-provisioned internal account for {Email} ({UserId})", user.Email, user.Id);
        }
        else if (!user.IsInternal)
        {
            // This email already belongs to a supplier-side account — do not silently
            // promote it to internal access. Treat as a conflict, not an auto-grant.
            _logger.LogWarning("Governance handoff rejected: {Email} belongs to an existing supplier account.", request.Email);
            return Conflict(new { error = "This email is already registered as a supplier account. Ask an admin to resolve this before using Governance Console." });
        }

        var token = _tokenService.GenerateToken(user);
        _logger.LogInformation("Governance handoff token minted for {Email} ({UserId})", user.Email, user.Id);
        return Ok(new { token, displayName = user.DisplayName, id = user.Id });
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

        // KYC-02: if a GSTIN is supplied at sign-up, it must be structurally valid.
        var kycErrors = WebProlific.Core.Validation.KycValidation.ValidateIdentifiers(request.Gstin, null);
        if (kycErrors.Count > 0)
        {
            _logger.LogWarning("Registration failed KYC validation: {Errors}", string.Join("; ", kycErrors));
            return BadRequest(new { error = kycErrors[0] });
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
public class GovernanceHandoffRequest
{
    public string Email { get; set; } = string.Empty;
    public string? DisplayName { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string? PropertyId { get; set; }
    public string? ChainId { get; set; }
}
