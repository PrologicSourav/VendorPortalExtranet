using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Http;
using Microsoft.Extensions.Logging;
using WebProlific.Core.Entities;
using WebProlific.Infrastructure.Data;

namespace WebProlific.Api.Services
{
    public interface ICurrencyConversionService
    {
        /// <summary>Returns null when no reliable exchange rate is available (do not display a fabricated total).</summary>
        Task<decimal?> ConvertAsync(decimal amount, string fromCurrency, string toCurrency);
        Task<Dictionary<string, decimal>> GetRatesAsync(string baseCurrency, IEnumerable<string> targetCurrencies);
        Task UpdateRatesAsync();
    }

    public class CurrencyConversionService : ICurrencyConversionService
    {
        private readonly AppDbContext _db;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<CurrencyConversionService> _logger;
        private const string ExternalApiUrl = "https://api.exchangerate.host/latest";

        public CurrencyConversionService(AppDbContext db, IHttpClientFactory httpClientFactory, ILogger<CurrencyConversionService> logger)
        {
            _db = db;
            _httpClientFactory = httpClientFactory;
            _logger = logger;
        }

        public async Task<decimal?> ConvertAsync(decimal amount, string fromCurrency, string toCurrency)
        {
            if (string.Equals(fromCurrency, toCurrency, StringComparison.OrdinalIgnoreCase))
                return amount;

            var rate = await GetRateAsync(fromCurrency, toCurrency);
            if (rate is null) return null;
            return Math.Round(amount * rate.Value, await GetPrecisionAsync(toCurrency));
        }

        public async Task<Dictionary<string, decimal>> GetRatesAsync(string baseCurrency, IEnumerable<string> targetCurrencies)
        {
            var rates = new Dictionary<string, decimal>();
            foreach (var target in targetCurrencies)
            {
                if (string.Equals(baseCurrency, target, StringComparison.OrdinalIgnoreCase))
                {
                    rates[target] = 1M;
                    continue;
                }

                var rate = await GetRateAsync(baseCurrency, target);
                if (rate is not null)
                    rates[target] = rate.Value;
            }
            return rates;
        }

        public async Task UpdateRatesAsync()
        {
            try
            {
                var client = _httpClientFactory.CreateClient();
                var response = await client.GetFromJsonAsync<ExternalRateResponse>($"{ExternalApiUrl}?base=USD&symbols=EUR,GBP,INR,AED,VND,THB");
                if (response == null || !response.Success)
                {
                    _logger.LogWarning("Failed to fetch exchange rates from external API.");
                    return;
                }

                var baseCurrency = "USD";
                var now = DateTime.UtcNow;
                var validFrom = now;
                var validTo = now.AddDays(1); // Rates valid for 1 day

                foreach (var kvp in response.Rates)
                {
                    var targetCurrency = kvp.Key;
                    var rate = kvp.Value;

                    // Check if we already have a rate for today
                    var existing = await _db.ExchangeRates
                        .FirstOrDefaultAsync(er => er.FromCurrencyCode == baseCurrency &&
                                                 er.ToCurrencyCode == targetCurrency &&
                                                 er.ValidFrom.Date == now.Date);

                    if (existing != null)
                    {
                        existing.Rate = rate;
                        existing.ValidTo = validTo;
                    }
                    else
                    {
                        _db.ExchangeRates.Add(new ExchangeRate
                        {
                            FromCurrencyCode = baseCurrency,
                            ToCurrencyCode = targetCurrency,
                            Rate = rate,
                            ValidFrom = validFrom,
                            ValidTo = validTo,
                            IsManual = false
                        });
                    }
                }

                await _db.SaveChangesAsync();
                _logger.LogInformation("Exchange rates updated successfully.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating exchange rates.");
            }
        }

        /// <summary>Returns null when no cached or fetchable rate exists — callers must not assume 1:1.</summary>
        private async Task<decimal?> GetRateAsync(string fromCurrency, string toCurrency)
        {
            // Try to get the rate from the database
            var rate = await _db.ExchangeRates
                .Where(er => er.FromCurrencyCode == fromCurrency &&
                             er.ToCurrencyCode == toCurrency &&
                             er.ValidFrom <= DateTime.UtcNow &&
                             er.ValidTo >= DateTime.UtcNow)
                .OrderByDescending(er => er.ValidFrom)
                .Select(er => er.Rate)
                .FirstOrDefaultAsync();

            if (rate > 0)
                return rate;

            // If not found, fetch from external API and store it
            try
            {
                var client = _httpClientFactory.CreateClient();
                var response = await client.GetFromJsonAsync<ExternalRateResponse>($"{ExternalApiUrl}?base={fromCurrency}&symbols={toCurrency}");
                if (response != null && response.Success && response.Rates.TryGetValue(toCurrency, out var apiRate))
                {
                    // Store the fetched rate for future use
                    var exchangeRate = new ExchangeRate
                    {
                        FromCurrencyCode = fromCurrency,
                        ToCurrencyCode = toCurrency,
                        Rate = apiRate,
                        ValidFrom = DateTime.UtcNow,
                        ValidTo = DateTime.UtcNow.AddDays(1),
                        IsManual = false
                    };
                    _db.ExchangeRates.Add(exchangeRate);
                    await _db.SaveChangesAsync();
                    return apiRate;
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to fetch exchange rate for {From} to {To} from external API.", fromCurrency, toCurrency);
            }

            _logger.LogWarning("No exchange rate available for {From} to {To}. Conversion will be omitted rather than shown as 1:1.", fromCurrency, toCurrency);
            return null;
        }

        private async Task<int> GetPrecisionAsync(string currencyCode)
        {
            var precision = await _db.Currencies
                .Where(c => c.Code == currencyCode)
                .Select(c => c.DecimalPrecision)
                .FirstOrDefaultAsync();

            return precision > 0 ? precision : 2; // Default to 2 decimal places
        }
    }

    // DTO for external API response
    internal class ExternalRateResponse
    {
        public bool Success { get; set; }
        public string Base { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public Dictionary<string, decimal> Rates { get; set; } = new Dictionary<string, decimal>();
    }
}