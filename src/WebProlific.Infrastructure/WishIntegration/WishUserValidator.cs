using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace WebProlific.Infrastructure.WishIntegration;

public class WishUserValidationResult
{
    public bool IsValid { get; set; }
    public string? Reason { get; set; }

    public static WishUserValidationResult Valid() => new() { IsValid = true };
    public static WishUserValidationResult Invalid(string reason) => new() { IsValid = false, Reason = reason };
}

/// <summary>
/// Live check against Web Prol'IFIC's own user master (menudb.OPM1.vo_user /
/// vo_user_templates) — used by the Governance Console handoff so a WISH-issued
/// token is backed by a real, currently-active WISH account with an actual
/// Governance Console (AIGOVC/INV114) template grant, not just the shared
/// secret + whatever email the caller happened to send. Same resilience
/// contract as WishBuyingEntityReader: an unconfigured/unreachable connection
/// fails the check rather than throwing, since this gate is security-relevant —
/// "can't verify" must not be treated as "verified".
/// </summary>
public class WishUserValidator
{
    private readonly string? _connectionString;
    private readonly ILogger<WishUserValidator> _logger;

    public WishUserValidator(IConfiguration config, ILogger<WishUserValidator> logger)
    {
        _connectionString = config.GetConnectionString("WishConnection");
        _logger = logger;
    }

    public bool IsConfigured => !string.IsNullOrWhiteSpace(_connectionString);

    public async Task<WishUserValidationResult> ValidateAsync(string userId, string? propertyId, string? chainId = null)
    {
        if (!IsConfigured)
        {
            _logger.LogWarning("Governance handoff WISH validation skipped: WishConnection is not configured.");
            return WishUserValidationResult.Invalid("WISH connection is not configured on this environment.");
        }

        try
        {
            await using var conn = new SqlConnection(_connectionString);
            await conn.OpenAsync();
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                SELECT TOP 1 u.template_id, u.delete_flg, u.disable_flg, u.lock_flag, u.frozen_flag,
                    CASE
                        WHEN LTRIM(RTRIM(ISNULL(u.template_id, ''))) = '' THEN 1
                        WHEN EXISTS (
                            SELECT 1 FROM menudb.OPM1.vo_user_templates t WITH (NOLOCK)
                            WHERE t.template_id = u.template_id AND t.vo_project = 'AIGOVC' AND t.vo_form = 'INV114'
                        ) THEN 1
                        ELSE 0
                    END AS HasGovernanceGrant
                FROM menudb.OPM1.vo_user u WITH (NOLOCK)
                WHERE u.user_id = @userId
                  AND (
                        (@propertyId <> '' AND u.property_id = @propertyId)
                     OR (@chainId <> '' AND u.chain_id = @chainId)
                     OR (@propertyId = '' AND @chainId = '')
                  )
                ORDER BY CASE WHEN u.property_id = @propertyId THEN 0 ELSE 1 END";
            cmd.Parameters.AddWithValue("@userId", userId);
            cmd.Parameters.AddWithValue("@propertyId", propertyId ?? "");
            cmd.Parameters.AddWithValue("@chainId", chainId ?? "");

            await using var reader = await cmd.ExecuteReaderAsync();
            if (!await reader.ReadAsync())
                return WishUserValidationResult.Invalid("No matching WISH user found.");

            string? templateId = reader.IsDBNull(0) ? null : reader.GetString(0).Trim();
            bool deleted = !reader.IsDBNull(1) && reader.GetString(1).Trim() == "Y";
            bool disabled = !reader.IsDBNull(2) && reader.GetString(2).Trim() == "Y";
            bool locked = !reader.IsDBNull(3) && reader.GetString(3).Trim() == "Y";
            bool frozen = !reader.IsDBNull(4) && reader.GetString(4).Trim() == "Y";
            bool hasGrant = !reader.IsDBNull(5) && reader.GetInt32(5) == 1;

            if (deleted) return WishUserValidationResult.Invalid("WISH account has been deleted.");
            if (disabled) return WishUserValidationResult.Invalid("WISH account is disabled.");
            if (locked) return WishUserValidationResult.Invalid("WISH account is locked.");
            if (frozen) return WishUserValidationResult.Invalid("WISH account is frozen.");
            if (!hasGrant) return WishUserValidationResult.Invalid($"WISH template '{templateId}' does not have Governance Console access.");

            return WishUserValidationResult.Valid();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Governance handoff WISH validation failed for user {UserId}", userId);
            return WishUserValidationResult.Invalid("Could not verify WISH account.");
        }
    }
}
