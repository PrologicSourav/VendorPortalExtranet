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
    private readonly WishBuyingEntitySyncService _entitySync;

    public WishSyncController(WishPurchaseOrderReader reader, WishPoSyncService sync, WishBuyingEntitySyncService entitySync)
    {
        _reader = reader;
        _sync = sync;
        _entitySync = entitySync;
    }

    [HttpGet("status")]
    public IActionResult Status() => Ok(new { configured = _reader.IsConfigured });

    /// <summary>Runs the chain/property master sync only — useful to refresh the
    /// dropdown without waiting for (or re-running) the full PO sync.</summary>
    [HttpPost("run-entities")]
    public async Task<IActionResult> RunEntities()
    {
        if (!_reader.IsConfigured)
            return BadRequest(new { message = "ConnectionStrings:WishConnection is not configured." });

        var summary = await _entitySync.RunAsync();
        return Ok(summary);
    }

    [HttpPost("run")]
    public async Task<IActionResult> Run()
    {
        if (!_reader.IsConfigured)
            return BadRequest(new { message = "ConnectionStrings:WishConnection is not configured." });

        var entitySummary = await _entitySync.RunAsync();
        var summary = await _sync.RunAsync();
        return Ok(new { entities = entitySummary, purchaseOrders = summary });
    }
}
