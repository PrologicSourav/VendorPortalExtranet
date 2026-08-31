using WebProlific.Infrastructure.WishIntegration;

namespace WebProlific.Api.Services;

/// <summary>
/// Periodically pulls printed, open Purchase Orders from Web Prol'IFIC (WISH) for
/// every vendor with a matching GSTIN/PAN, and upserts them into this system's own
/// database. A no-op loop (just sleeps) when ConnectionStrings:WishConnection isn't
/// configured, so environments with no network path to WISH's database — e.g. a
/// cloud deployment with no route to an on-prem SQL Server — aren't affected.
/// </summary>
public class WishSyncBackgroundService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<WishSyncBackgroundService> _logger;
    private readonly TimeSpan _interval;

    public WishSyncBackgroundService(
        IServiceScopeFactory scopeFactory,
        ILogger<WishSyncBackgroundService> logger,
        IConfiguration config)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        var minutes = config.GetValue<int?>("Wish:SyncIntervalMinutes") ?? 15;
        _interval = TimeSpan.FromMinutes(Math.Max(1, minutes));
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Give the app a moment to finish starting (DB migration, etc.) before the
        // first run, rather than racing it.
        try { await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken); }
        catch (OperationCanceledException) { return; }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var reader = scope.ServiceProvider.GetRequiredService<WishPurchaseOrderReader>();
                if (reader.IsConfigured)
                {
                    // Chain/property master first — PO sync attaches each PO to a
                    // BuyingEntity/Property by WishPropertyId, so those rows need to
                    // exist (or be refreshed) before it runs.
                    var entitySync = scope.ServiceProvider.GetRequiredService<WishBuyingEntitySyncService>();
                    await entitySync.RunAsync(stoppingToken);

                    var sync = scope.ServiceProvider.GetRequiredService<WishPoSyncService>();
                    await sync.RunAsync(stoppingToken);
                }
                else
                {
                    _logger.LogDebug("WISH sync: ConnectionStrings:WishConnection not configured — skipping run.");
                }
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                // A failed run (e.g. WISH's DB unreachable right now) must not crash
                // the API or stop future attempts — just log and retry next interval.
                _logger.LogError(ex, "WISH sync run failed.");
            }

            try { await Task.Delay(_interval, stoppingToken); }
            catch (OperationCanceledException) { break; }
        }
    }
}
