using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using WebProlific.Core.Entities;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;

namespace WebProlific.Api.Services;

public interface ITokenService
{
    string GenerateToken(AppUser user);
}

public class TokenService : ITokenService
{
    private readonly IConfiguration _config;
    private readonly ILogger<TokenService> _logger;

    public TokenService(IConfiguration config, ILogger<TokenService> logger)
    {
        _config = config;
        _logger = logger;
    }

    public string GenerateToken(AppUser user)
    {
        _logger.LogInformation("Generating JWT token for user: {UserId} ({Email})", user.Id, user.Email);

        var jwtKey = _config["Jwt:Key"];
        if (string.IsNullOrWhiteSpace(jwtKey))
            throw new InvalidOperationException("Jwt:Key is not configured. Set it via the Jwt__Key environment variable.");
        var issuer = _config["Jwt:Issuer"] ?? "WebProlific";
        var audience = _config["Jwt:Audience"] ?? "WebProlific";
        var expiryMinutes = int.TryParse(_config["Jwt:ExpiryMinutes"], out var minutes) ? minutes : 480;

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Name, user.DisplayName),
            new Claim(ClaimTypes.Role, user.Role.ToString()),
            new Claim("vendorId", user.VendorId?.ToString() ?? ""),
            new Claim("isInternal", user.IsInternal.ToString()),
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expiryMinutes),
            signingCredentials: creds
        );

        var tokenString = new JwtSecurityTokenHandler().WriteToken(token);
        _logger.LogDebug("JWT token generated successfully for user: {UserId}", user.Id);
        return tokenString;
    }
}
