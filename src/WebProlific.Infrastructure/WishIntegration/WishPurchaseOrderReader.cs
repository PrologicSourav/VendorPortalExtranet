using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace WebProlific.Infrastructure.WishIntegration;

/// <summary>
/// Read-only access to Web Prol'IFIC's own database (invdb) — the legacy ERP the
/// hotel/property actually raises and prints Purchase Orders in. Every method here
/// issues a plain parameterized SELECT; nothing in this class ever writes to invdb.
/// The connection is optional: if ConnectionStrings:WishConnection isn't configured
/// (e.g. on a deployment with no network path to WISH's database), every method
/// simply returns an empty result instead of throwing, so the rest of the API keeps
/// working without this integration.
/// </summary>
public class WishPurchaseOrderReader
{
    private readonly string? _connectionString;
    private readonly ILogger<WishPurchaseOrderReader> _logger;

    public WishPurchaseOrderReader(IConfiguration config, ILogger<WishPurchaseOrderReader> logger)
    {
        _connectionString = config.GetConnectionString("WishConnection");
        _logger = logger;
    }

    public bool IsConfigured => !string.IsNullOrWhiteSpace(_connectionString);

    /// <summary>WISH vendor_id values whose gst_reg_no or pan_number matches
    /// (trimmed, exact match) — the correlation key back to a Vendor Portal Vendor.</summary>
    public async Task<List<string>> FindVendorIdsAsync(string? gstin, string? pan)
    {
        var ids = new List<string>();
        var g = gstin?.Trim() ?? "";
        var p = pan?.Trim() ?? "";
        if (!IsConfigured || (g.Length == 0 && p.Length == 0)) return ids;

        try
        {
            await using var conn = new SqlConnection(_connectionString);
            await conn.OpenAsync();
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                SELECT DISTINCT vendor_id FROM OPM1.vendors WITH (NOLOCK)
                WHERE (@gstin <> '' AND LTRIM(RTRIM(ISNULL(gst_reg_no,''))) = @gstin)
                   OR (@pan <> '' AND LTRIM(RTRIM(ISNULL(pan_number,''))) = @pan)";
            cmd.Parameters.AddWithValue("@gstin", g);
            cmd.Parameters.AddWithValue("@pan", p);

            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
                ids.Add(reader.GetString(0).Trim());
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "WISH vendor lookup failed for GSTIN {Gstin}/PAN {Pan}", g, p);
        }
        return ids;
    }

    /// <summary>Printed, still-open POs (not cancelled, not closed) for the given WISH
    /// vendor ids — latest amendment per po_number/po_date/property_id only.</summary>
    public async Task<List<WishPoHeader>> GetPrintedOpenPurchaseOrdersAsync(IEnumerable<string> vendorIds)
    {
        var result = new List<WishPoHeader>();
        var ids = vendorIds.Where(v => !string.IsNullOrWhiteSpace(v)).Distinct().ToList();
        if (!IsConfigured || ids.Count == 0) return result;

        try
        {
            await using var conn = new SqlConnection(_connectionString);
            await conn.OpenAsync();

            var paramNames = ids.Select((_, i) => $"@v{i}").ToList();
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = $@"
                ;WITH latest AS (
                    SELECT po_number, po_date, property_id, MAX(amd_number) AS amd_number
                    FROM OPM1.purchase_orders WITH (NOLOCK)
                    WHERE vendor_id IN ({string.Join(",", paramNames)})
                      AND ISNULL(printed_flag,'N') = 'Y'
                      AND ISNULL(cancelled_flag,'N') <> 'Y'
                      AND ISNULL(closed_flag,'N') <> 'Y'
                    GROUP BY po_number, po_date, property_id
                )
                SELECT p.po_number, p.po_date, p.amd_number, p.property_id, p.vendor_id,
                       p.remarks, p.despatch_inst, p.packing_inst, p.fx_code,
                       p.total_amount, p.final_amount, p.created_on
                FROM OPM1.purchase_orders p WITH (NOLOCK)
                JOIN latest l ON l.po_number = p.po_number AND l.po_date = p.po_date
                             AND l.property_id = p.property_id AND l.amd_number = p.amd_number
                WHERE p.vendor_id IN ({string.Join(",", paramNames)})
                ORDER BY p.created_on DESC";
            for (var i = 0; i < ids.Count; i++)
                cmd.Parameters.AddWithValue(paramNames[i], ids[i]);

            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                result.Add(new WishPoHeader
                {
                    PoNumber = reader.GetInt32(0),
                    PoDate = reader.GetDateTime(1),
                    AmdNumber = Convert.ToInt32(reader.GetInt16(2)),
                    PropertyId = reader.GetString(3).Trim(),
                    VendorId = reader.GetString(4).Trim(),
                    Remarks = ReadTrimmedString(reader, 5),
                    DespatchInstructions = ReadTrimmedString(reader, 6),
                    PackingInstructions = ReadTrimmedString(reader, 7),
                    FxCode = ReadTrimmedString(reader, 8),
                    TotalAmount = reader.IsDBNull(9) ? 0 : reader.GetDecimal(9),
                    FinalAmount = reader.IsDBNull(10) ? 0 : reader.GetDecimal(10),
                    CreatedOn = reader.IsDBNull(11) ? null : reader.GetDateTime(11),
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "WISH PO lookup failed for vendor ids {VendorIds}", string.Join(",", ids));
        }
        return result;
    }

    /// <summary>Line items for one WISH PO (a specific po_number/po_date/amd_number/property_id).</summary>
    public async Task<List<WishPoLine>> GetPurchaseOrderLinesAsync(int poNumber, DateTime poDate, int amdNumber, string propertyId)
    {
        var lines = new List<WishPoLine>();
        if (!IsConfigured) return lines;

        try
        {
            await using var conn = new SqlConnection(_connectionString);
            await conn.OpenAsync();
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                SELECT item_seq_id, vendor_item_desc, qty_ordered, unit_id, item_rate, tot_amount, qty_recvd
                FROM OPM1.po_items WITH (NOLOCK)
                WHERE po_number = @po AND po_date = @dt AND amd_number = @amd AND property_id = @prop
                ORDER BY sl_no";
            cmd.Parameters.AddWithValue("@po", poNumber);
            cmd.Parameters.AddWithValue("@dt", poDate);
            cmd.Parameters.AddWithValue("@amd", amdNumber);
            cmd.Parameters.AddWithValue("@prop", propertyId);

            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                lines.Add(new WishPoLine
                {
                    ItemSeqId = reader.GetInt32(0),
                    ItemDescription = ReadTrimmedString(reader, 1) ?? "",
                    QtyOrdered = reader.IsDBNull(2) ? 0 : Convert.ToDecimal(reader.GetDouble(2)),
                    UnitId = ReadTrimmedString(reader, 3),
                    ItemRate = reader.IsDBNull(4) ? 0 : reader.GetDecimal(4),
                    TotAmount = reader.IsDBNull(5) ? 0 : reader.GetDecimal(5),
                    QtyRecvd = reader.IsDBNull(6) ? 0 : Convert.ToDecimal(reader.GetDouble(6)),
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "WISH PO line lookup failed for PO {PoNumber}/{PoDate}/{AmdNumber}/{PropertyId}",
                poNumber, poDate, amdNumber, propertyId);
        }
        return lines;
    }

    private static string? ReadTrimmedString(SqlDataReader reader, int ordinal) =>
        reader.IsDBNull(ordinal) ? null : reader.GetString(ordinal).Trim();
}
