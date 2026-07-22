using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebProlific.Api.Extensions;
using WebProlific.Core.Entities;
using WebProlific.Infrastructure.Data;

namespace WebProlific.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ConfigurationController : ControllerBase
{
    private readonly AppDbContext _db;

    public ConfigurationController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("languages")]
    public IActionResult GetLanguages()
    {
        var languages = new[]
        {
            new { code = "en", name = "English" },
            new { code = "ar", name = "Arabic" },
            new { code = "vi", name = "Vietnamese" },
            new { code = "th", name = "Thai" }
        };
        return Ok(languages);
    }

    [HttpGet("currencies")]
    public async Task<IActionResult> GetCurrencies()
    {
        var currencies = await _db.Currencies
            .Where(c => c.IsActive)
            .Select(c => new
            {
                c.Code,
                c.Name,
                c.Symbol,
                c.DecimalPrecision
            })
            .ToListAsync();
        return Ok(currencies);
    }

    [HttpPut("users/{userId:guid}/preferences")]
    public async Task<IActionResult> UpdatePreferences(Guid userId, [FromBody] UserPreferencesDto dto)
    {
        if (User.GetUserId() != userId) return Forbid();

        var user = await _db.Users.FindAsync(userId);
        if (user is null) return NotFound();

        if (!string.IsNullOrEmpty(dto.LanguageCode))
            user.LanguageCode = dto.LanguageCode;
        if (!string.IsNullOrEmpty(dto.PreferredCurrencyCode))
            user.PreferredCurrencyCode = dto.PreferredCurrencyCode;

        await _db.SaveChangesAsync();
        return Ok(new { user.LanguageCode, user.PreferredCurrencyCode });
    }
}

public class UserPreferencesDto
{
    public string? LanguageCode { get; set; }
    public string? PreferredCurrencyCode { get; set; }
}