using Microsoft.AspNetCore.Http;

namespace WebProlific.Api.Extensions;

public static class HttpContextExtensions
{
    /// <summary>The local Property.Id a governance-console request is scoped to,
    /// if GovernancePropertyMiddleware resolved one from the X-Wish-Property-Id
    /// header — null for every other request (unscoped, the default).</summary>
    public static Guid? GetGovernancePropertyId(this HttpContext context) =>
        context.Items["GovernancePropertyId"] as Guid?;
}
