using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using WebProlific.Infrastructure.Data;

namespace WebProlific.Api.Middleware;

/// <summary>
/// Resolves an optional governance property-scope context from the
/// X-Wish-Property-Id header (the governance console attaches this on every
/// request when it was launched with a ?propertyId= — the WISH property_id —
/// on its URL, the same host-embedded pattern used for the JWT itself). Stores
/// the matching local Property.Id in HttpContext.Items for controllers to
/// optionally narrow their results to.
///
/// Absent header (the normal case — vendor portal requests, or a governance
/// session opened without a property context) leaves the item unset, and
/// every governance screen behaves exactly as it does today: unscoped.
/// </summary>
public class GovernancePropertyMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GovernancePropertyMiddleware> _logger;
    private readonly IServiceScopeFactory _scopeFactory;

    public GovernancePropertyMiddleware(RequestDelegate next, ILogger<GovernancePropertyMiddleware> logger, IServiceScopeFactory scopeFactory)
    {
        _next = next;
        _logger = logger;
        _scopeFactory = scopeFactory;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var wishPropertyId = context.Request.Headers["X-Wish-Property-Id"].ToString();
        if (!string.IsNullOrWhiteSpace(wishPropertyId))
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var property = await db.Properties.FirstOrDefaultAsync(p => p.WishPropertyId == wishPropertyId.Trim());
            if (property is not null)
            {
                context.Items["GovernancePropertyId"] = property.Id;
                // The chain too — screens whose primary record is only chain
                // -scoped (Catalogue) or has no direct property link at all and
                // needs to match a chain-wide relationship/request (KYC) both
                // need this, not just the property id itself.
                context.Items["GovernanceBuyingEntityId"] = property.BuyingEntityId;
                // The raw WISH id too — lets a controller push a property filter
                // down into a WISH-side SQL query instead of pulling everything
                // over the network and filtering in memory (see GetUnmapped).
                context.Items["GovernanceWishPropertyId"] = property.WishPropertyId;
            }
            else
            {
                _logger.LogWarning("Governance property context header {WishPropertyId} did not match any synced Property", wishPropertyId);
            }
        }

        await _next(context);
    }
}
