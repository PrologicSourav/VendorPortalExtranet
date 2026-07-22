using System.Security.Claims;

namespace WebProlific.Api.Extensions;

public static class ClaimsPrincipalExtensions
{
    public static Guid? GetUserId(this ClaimsPrincipal user)
    {
        var claim = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(claim, out var id) ? id : null;
    }

    public static Guid? GetVendorId(this ClaimsPrincipal user)
    {
        var claim = user.FindFirst("vendorId")?.Value;
        return Guid.TryParse(claim, out var id) ? id : null;
    }

    public static bool IsInternal(this ClaimsPrincipal user)
    {
        return bool.TryParse(user.FindFirst("isInternal")?.Value, out var isInternal) && isInternal;
    }

    /// <summary>Internal staff can access any vendor's data; supplier users only their own.</summary>
    public static bool CanAccessVendor(this ClaimsPrincipal user, Guid vendorId)
    {
        return user.IsInternal() || user.GetVendorId() == vendorId;
    }
}
