using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace WebProlific.Infrastructure.WishIntegration;

public class WishChain
{
    public string ChainId { get; set; } = string.Empty;
    public string ChainName { get; set; } = string.Empty;
}

public class WishProperty
{
    public string PropertyId { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? Location { get; set; }
    /// <summary>Null when WISH has no company_chain_link row for this property —
    /// skipped by the sync rather than guessed at.</summary>
    public string? ChainId { get; set; }
}

/// <summary>
/// Read-only access to Web Prol'IFIC's chain/property master (menudb.OPM1.chains /
/// vo_property / company_chain_link) — a different WISH database than the one PO
/// data lives in (invdb), reached via 3-part cross-database names over the same
/// connection. Same resilience contract as WishPurchaseOrderReader: every method
/// is a plain SELECT, and an unconfigured/unreachable/under-permissioned connection
/// (e.g. the app's WISH login not granted access to menudb) makes every method
/// return empty instead of throwing.
/// </summary>
public class WishBuyingEntityReader
{
    private readonly string? _connectionString;
    private readonly ILogger<WishBuyingEntityReader> _logger;

    public WishBuyingEntityReader(IConfiguration config, ILogger<WishBuyingEntityReader> logger)
    {
        _connectionString = config.GetConnectionString("WishConnection");
        _logger = logger;
    }

    public bool IsConfigured => !string.IsNullOrWhiteSpace(_connectionString);

    public async Task<List<WishChain>> GetChainsAsync()
    {
        var result = new List<WishChain>();
        if (!IsConfigured) return result;

        try
        {
            await using var conn = new SqlConnection(_connectionString);
            await conn.OpenAsync();
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                SELECT chain_id, chain_name
                FROM menudb.OPM1.chains WITH (NOLOCK)
                WHERE ISNULL(chain_id, '') <> ''";

            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                result.Add(new WishChain
                {
                    ChainId = reader.GetString(0).Trim(),
                    ChainName = reader.IsDBNull(1) ? "" : reader.GetString(1).Trim(),
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "WISH chain master lookup failed (menudb.OPM1.chains)");
        }
        return result;
    }

    public async Task<List<WishProperty>> GetPropertiesAsync()
    {
        var result = new List<WishProperty>();
        if (!IsConfigured) return result;

        try
        {
            await using var conn = new SqlConnection(_connectionString);
            await conn.OpenAsync();
            await using var cmd = conn.CreateCommand();
            // A property can have more than one company_chain_link row (multiple
            // companies under the same chain); take one chain_id per property
            // deterministically rather than fan out duplicate rows.
            cmd.CommandText = @"
                ;WITH ranked_links AS (
                    SELECT property_id, chain_id,
                           ROW_NUMBER() OVER (PARTITION BY property_id ORDER BY chain_id) AS rn
                    FROM menudb.OPM1.company_chain_link WITH (NOLOCK)
                )
                SELECT p.property_id, p.description, p.property_location, l.chain_id
                FROM menudb.OPM1.vo_property p WITH (NOLOCK)
                LEFT JOIN ranked_links l ON l.property_id = p.property_id AND l.rn = 1
                WHERE ISNULL(p.property_id, '') <> ''";

            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                result.Add(new WishProperty
                {
                    PropertyId = reader.GetString(0).Trim(),
                    Description = reader.IsDBNull(1) ? "" : reader.GetString(1).Trim(),
                    Location = reader.IsDBNull(2) ? null : reader.GetString(2).Trim(),
                    ChainId = reader.IsDBNull(3) ? null : reader.GetString(3).Trim(),
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "WISH property master lookup failed (menudb.OPM1.vo_property)");
        }
        return result;
    }
}
