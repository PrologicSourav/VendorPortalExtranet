using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebProlific.Infrastructure.WishIntegration;

namespace WebProlific.Api.Controllers;

/// <summary>Manual control over the Web Prol'IFIC PO sync — lets internal staff check
/// whether the integration is configured and trigger an immediate run instead of
/// waiting for the next scheduled interval.</summary>
[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "InternalOnly")]
public class WishSyncController : ControllerBase
{
    private readonly WishPurchaseOrderReader _reader;
    private readonly WishPoSyncService _sync;

    public WishSyncController(WishPurchaseOrderReader reader, WishPoSyncService sync)
    {
        _reader = reader;
        _sync = sync;
    }

    [HttpGet("status")]
    public IActionResult Status() => Ok(new { configured = _reader.IsConfigured });

    [HttpPost("run")]
    public async Task<IActionResult> Run()
    {
        if (!_reader.IsConfigured)
            return BadRequest(new { message = "ConnectionStrings:WishConnection is not configured." });

        var summary = await _sync.RunAsync();
        return Ok(summary);
    }
}
