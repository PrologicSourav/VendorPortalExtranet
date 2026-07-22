using System.Security.Claims;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using System.Globalization;
using WebProlific.Core.Entities;
using WebProlific.Infrastructure.Data;

namespace WebProlific.Api.Middleware;

public class LocalizationMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<LocalizationMiddleware> _logger;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IConfiguration _config;

    public LocalizationMiddleware(RequestDelegate next, ILogger<LocalizationMiddleware> logger, IServiceScopeFactory scopeFactory, IConfiguration config)
    {
        _next = next;
        _logger = logger;
        _scopeFactory = scopeFactory;
        _config = config;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // 1️⃣ Resolve culture from multiple sources in priority order
        var culture = ResolveCulture(context);
        var cultureInfo = new CultureInfo(culture);

        // 2️⃣ Apply culture to thread and UI
        CultureInfo.CurrentCulture = cultureInfo;
        CultureInfo.CurrentUICulture = cultureInfo;

        // 3️⃣ Persist user preference (if authenticated) and set currency
        if (context.User.Identity?.IsAuthenticated == true)
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var userId = GetUserId(context);
            var user = await db.Users.FindAsync(userId);
            if (user != null)
            {
                if (user.LanguageCode != culture)
                {
                    user.LanguageCode = culture;
                    await db.SaveChangesAsync();
                    _logger.LogInformation("Updated language preference for user {UserId} to {Culture}", userId, culture);
                }

                // Store user's preferred currency in HttpContext.Items for use in controllers
                context.Items["UserCurrency"] = user.PreferredCurrencyCode;
            }
            else
            {
                // User not found, fallback to default currency
                var defaultCurrency = _config["Currency:DefaultCurrency"] ?? "INR";
                context.Items["UserCurrency"] = defaultCurrency;
            }
        }
        else
        {
            // Not authenticated, use default currency from config
            var defaultCurrency = _config["Currency:DefaultCurrency"] ?? "INR";
            context.Items["UserCurrency"] = defaultCurrency;
        }

        await _next(context);
    }

    private string ResolveCulture(HttpContext context)
    {
        // Priority 1: Accept-Language header
        var acceptLang = context.Request.Headers["Accept-Language"].ToString();
        if (!string.IsNullOrWhiteSpace(acceptLang))
        {
            var firstLang = acceptLang.Split(',')[0].Trim();
            if (TryNormalize(firstLang, out var normalized))
                return normalized;
        }

        // Priority 2: Cookie preference
        if (context.Request.Cookies.TryGetValue("wp_lang", out var cookieLang) && TryNormalize(cookieLang, out var cookieNormalized))
            return cookieNormalized;

        // Priority 3: Database user preference (for authenticated users)
        if (context.User.Identity?.IsAuthenticated == true)
        {
            var userId = GetUserId(context);
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var userLang = db.Users.Where(u => u.Id == userId)
                .Select(u => u.LanguageCode)
                .FirstOrDefault();
            if (!string.IsNullOrWhiteSpace(userLang) && TryNormalize(userLang, out var userNormalized))
                return userNormalized;
        }

        // Priority 4: Browser default
        if (TryNormalize(CultureInfo.CurrentCulture.Name, out var browserNormalized))
            return browserNormalized;

        // Fallback to English
        return "en";
    }

    /// <summary>
    /// Returns true and the normalized (known-safe) language code if the candidate's
    /// language prefix is supported. Never returns the raw client-supplied string —
    /// that string may be malformed in ways CultureInfo rejects even when its prefix looks valid.
    /// </summary>
    private bool TryNormalize(string? culture, out string normalized)
    {
        var lang = (culture ?? string.Empty).Split('-')[0];
        var supported = new[] { "en", "ar", "vi", "th" };
        var match = supported.FirstOrDefault(s => string.Equals(s, lang, StringComparison.OrdinalIgnoreCase));
        normalized = match ?? "en";
        return match != null;
    }

    private Guid GetUserId(HttpContext context)
    {
        var claim = context.User.FindFirst(ClaimTypes.NameIdentifier);
        return claim != null && Guid.TryParse(claim.Value, out var userId) ? userId : Guid.Empty;
    }
}
