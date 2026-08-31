using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using WebProlific.Core.Entities;
using WebProlific.Infrastructure.Data;

namespace WebProlific.Infrastructure.WishIntegration;

public class WishBuyingEntitySyncSummary
{
    public int ChainsCreated { get; set; }
    public int ChainsUpdated { get; set; }
    public int PropertiesCreated { get; set; }
    public int PropertiesUpdated { get; set; }
    public int PropertiesSkippedNoChain { get; set; }
}

/// <summary>
/// Pulls Web Prol'IFIC's own chain/property master (menudb.OPM1.chains / vo_property)
/// into this system's BuyingEntity/Property tables, so the "Chain" and "Property"
/// concepts used across the vendor portal (relationships, workspace switcher, PO
/// buying entity) line up with WISH's real data instead of hand-entered test rows.
/// Never writes to WISH — see WishBuyingEntityReader, which only ever issues SELECTs.
/// Idempotent: re-running refreshes names/chain links on existing rows (matched by
/// WishChainId/WishPropertyId) rather than duplicating them.
/// </summary>
public class WishBuyingEntitySyncService
{
    private readonly AppDbContext _db;
    private readonly WishBuyingEntityReader _wish;
    private readonly ILogger<WishBuyingEntitySyncService> _logger;

    public WishBuyingEntitySyncService(AppDbContext db, WishBuyingEntityReader wish, ILogger<WishBuyingEntitySyncService> logger)
    {
        _db = db;
        _wish = wish;
        _logger = logger;
    }

    public async Task<WishBuyingEntitySyncSummary> RunAsync(CancellationToken ct = default)
    {
        var summary = new WishBuyingEntitySyncSummary();
        if (!_wish.IsConfigured)
        {
            _logger.LogInformation("WISH chain/property sync skipped: ConnectionStrings:WishConnection is not configured.");
            return summary;
        }

        var wishChains = await _wish.GetChainsAsync();
        var wishProperties = await _wish.GetPropertiesAsync();

        var existingEntities = await _db.BuyingEntities
            .Where(be => be.WishChainId != null)
            .ToListAsync(ct);
        var entityByWishId = existingEntities.ToDictionary(be => be.WishChainId!, be => be);

        foreach (var chain in wishChains)
        {
            if (entityByWishId.TryGetValue(chain.ChainId, out var existing))
            {
                if (existing.Name != chain.ChainName && !string.IsNullOrWhiteSpace(chain.ChainName))
                {
                    existing.Name = chain.ChainName;
                    summary.ChainsUpdated++;
                }
            }
            else
            {
                var created = new BuyingEntity
                {
                    Id = Guid.NewGuid(),
                    Name = string.IsNullOrWhiteSpace(chain.ChainName) ? chain.ChainId : chain.ChainName,
                    Code = chain.ChainId,
                    WishChainId = chain.ChainId,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                };
                _db.BuyingEntities.Add(created);
                entityByWishId[chain.ChainId] = created;
                summary.ChainsCreated++;
            }
        }
        await _db.SaveChangesAsync(ct);

        var existingProperties = await _db.Properties
            .Where(p => p.WishPropertyId != null)
            .ToListAsync(ct);
        var propertyByWishId = existingProperties.ToDictionary(p => p.WishPropertyId!, p => p);

        foreach (var wishProperty in wishProperties)
        {
            if (string.IsNullOrWhiteSpace(wishProperty.ChainId) || !entityByWishId.TryGetValue(wishProperty.ChainId, out var entity))
            {
                // No company_chain_link row (or its chain hasn't synced) — nothing
                // reliable to attach it to. Skip rather than guess a default chain.
                summary.PropertiesSkippedNoChain++;
                continue;
            }

            var name = string.IsNullOrWhiteSpace(wishProperty.Description) ? wishProperty.PropertyId : wishProperty.Description;

            if (propertyByWishId.TryGetValue(wishProperty.PropertyId, out var existing))
            {
                existing.Name = name;
                existing.City = wishProperty.Location;
                existing.BuyingEntityId = entity.Id;
                summary.PropertiesUpdated++;
            }
            else
            {
                var created = new Property
                {
                    Id = Guid.NewGuid(),
                    BuyingEntityId = entity.Id,
                    Name = name,
                    Code = wishProperty.PropertyId,
                    City = wishProperty.Location,
                    WishPropertyId = wishProperty.PropertyId,
                    IsActive = true,
                };
                _db.Properties.Add(created);
                summary.PropertiesCreated++;
            }
        }
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation(
            "WISH chain/property sync complete: {ChainsCreated} chain(s) created, {ChainsUpdated} updated, " +
            "{PropertiesCreated} property(ies) created, {PropertiesUpdated} updated, {Skipped} skipped (no chain link).",
            summary.ChainsCreated, summary.ChainsUpdated, summary.PropertiesCreated, summary.PropertiesUpdated, summary.PropertiesSkippedNoChain);
        return summary;
    }
}
