namespace WebProlific.Core.Entities;

public class Currency
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty; // ISO 4217 code, e.g., USD
    public string Name { get; set; } = string.Empty; // Friendly name
    public string Symbol { get; set; } = string.Empty; // Currency symbol
    // byte, not int — the live DB column is tinyint (a value like 2-4 never needs
    // more range than that); the EF model previously declared int, mismatching the
    // physical schema and crashing every read of this column with an
    // InvalidCastException ("Unable to cast object of type 'System.Byte' to
    // type 'System.Int32'") the moment it was projected instead of the full entity.
    public byte DecimalPrecision { get; set; } = 2; // Number of fractional digits
    public bool IsActive { get; set; } = true;
}