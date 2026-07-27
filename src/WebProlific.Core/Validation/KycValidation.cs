using System.Text.RegularExpressions;

namespace WebProlific.Core.Validation;

/// <summary>
/// Structural validation for Indian tax identifiers (KYC-02).
///  - PAN: 5 letters + 4 digits + 1 letter.
///  - GSTIN: 15 chars = 2-digit state code + 10-char PAN + entity digit + 'Z' +
///    a mod-36 checksum character, whose value is verified.
///  - Cross-field: the PAN embedded in GSTIN chars 3-12 must equal the captured PAN.
/// All checks are pure and side-effect free so they can run on any capture path.
/// </summary>
public static class KycValidation
{
    // Ordered code points for the GSTIN mod-36 checksum: 0-9 then A-Z (index 0..35).
    private const string CodePoints = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    private static readonly Regex PanRegex = new("^[A-Z]{5}[0-9]{4}[A-Z]$", RegexOptions.Compiled);
    private static readonly Regex GstinStructureRegex =
        new("^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$", RegexOptions.Compiled);

    public static string Normalize(string? value) => (value ?? string.Empty).Trim().ToUpperInvariant();

    public static bool IsValidPan(string? pan) => PanRegex.IsMatch(Normalize(pan));

    /// <summary>Validates GSTIN structure AND its mod-36 check digit.</summary>
    public static bool IsValidGstin(string? gstin)
    {
        var g = Normalize(gstin);
        return GstinStructureRegex.IsMatch(g) && HasValidGstinCheckDigit(g);
    }

    /// <summary>The PAN in GSTIN characters 3-12 must equal the captured PAN.</summary>
    public static bool GstinMatchesPan(string? gstin, string? pan)
    {
        var g = Normalize(gstin);
        var p = Normalize(pan);
        if (g.Length != 15 || p.Length != 10) return false;
        return g.Substring(2, 10) == p;
    }

    private static bool HasValidGstinCheckDigit(string gstin)
    {
        if (gstin.Length != 15) return false;

        int factor = 2, sum = 0, mod = CodePoints.Length; // 36
        // Weight the first 14 characters right-to-left, alternating factor 2/1.
        for (int i = 13; i >= 0; i--)
        {
            int codePoint = CodePoints.IndexOf(gstin[i]);
            if (codePoint < 0) return false;
            int digit = factor * codePoint;
            digit = (digit / mod) + (digit % mod);
            sum += digit;
            factor = factor == 2 ? 1 : 2;
        }

        int checkCodePoint = (mod - (sum % mod)) % mod;
        return CodePoints[checkCodePoint] == gstin[14];
    }

    /// <summary>
    /// Validates the GSTIN/PAN pair, returning human-readable errors (empty = valid).
    /// Blank identifiers are skipped here — presence is a separate KYC-status concern;
    /// this method only rejects *malformed* input (KYC-02).
    /// </summary>
    public static IReadOnlyList<string> ValidateIdentifiers(string? gstin, string? pan)
    {
        var errors = new List<string>();
        var hasGstin = !string.IsNullOrWhiteSpace(gstin);
        var hasPan = !string.IsNullOrWhiteSpace(pan);

        if (hasPan && !IsValidPan(pan))
            errors.Add("PAN is invalid. Expected format: 5 letters, 4 digits, 1 letter (e.g. AAPFU0939F).");

        if (hasGstin && !IsValidGstin(gstin))
            errors.Add("GSTIN is invalid — check the 15-character structure and the checksum digit.");

        // Cross-field only when both are individually well-formed.
        if (hasGstin && hasPan && IsValidGstin(gstin) && IsValidPan(pan) && !GstinMatchesPan(gstin, pan))
            errors.Add("GSTIN does not match PAN: characters 3-12 of the GSTIN must equal the PAN.");

        return errors;
    }
}
