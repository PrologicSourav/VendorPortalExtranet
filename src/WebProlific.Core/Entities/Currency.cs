namespace WebProlific.Core.Entities;

public class Currency
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty; // ISO 4217 code, e.g., USD
    public string Name { get; set; } = string.Empty; // Friendly name
    public string Symbol { get; set; } = string.Empty; // Currency symbol
    public int DecimalPrecision { get; set; } = 2; // Number of fractional digits
    public bool IsActive { get; set; } = true;
}