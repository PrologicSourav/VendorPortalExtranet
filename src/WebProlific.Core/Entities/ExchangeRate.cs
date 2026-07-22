namespace WebProlific.Core.Entities;

public class ExchangeRate
{
    public Guid Id { get; set; }
    public string FromCurrencyCode { get; set; } = string.Empty; // ISO code
    public string ToCurrencyCode { get; set; } = string.Empty;   // ISO code
    public decimal Rate { get; set; }
    public DateTime ValidFrom { get; set; }
    public DateTime ValidTo { get; set; }
    public bool IsManual { get; set; } // true if set by admin, false if fetched from external API
}