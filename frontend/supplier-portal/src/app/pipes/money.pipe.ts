import { Pipe, PipeTransform } from "@angular/core";
import { TranslateService } from "@ngx-translate/core";
import { CurrencyService } from "../services/currency.service";

/**
 * Formats a base-currency (INR) amount in the user's selected display currency,
 * converting via the current exchange rate. Impure so it re-evaluates when the
 * selected currency or loaded rates change — no page reload needed.
 *
 * If no rate is available for the target currency, it falls back to showing the
 * amount in the base currency (never a fabricated 1:1 conversion).
 *
 * Usage: {{ amountInInr | money }}  or  {{ amountInInr | money: '1.2-2' }}
 */
@Pipe({ name: "money", standalone: true, pure: false })
export class MoneyPipe implements PipeTransform {
  constructor(
    private currency: CurrencyService,
    private translate: TranslateService,
  ) {}

  transform(value: number | string | null | undefined): string {
    if (value === null || value === undefined || value === "") return "";
    const amount = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(amount)) return "";

    const selected = this.currency.selectedCurrency();
    const converted = this.currency.convertFromBase(amount);
    const displayCode = converted != null ? selected : this.currency.baseCurrency;
    const displayValue = converted != null ? converted : amount;
    const locale = this.translate.currentLang() || "en";

    try {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: displayCode,
        minimumFractionDigits: this.currency.decimalPrecisionFor(displayCode),
        maximumFractionDigits: this.currency.decimalPrecisionFor(displayCode),
      }).format(displayValue);
    } catch {
      // Unknown currency code for Intl — fall back to a plain formatted number.
      return `${displayCode} ${displayValue.toFixed(2)}`;
    }
  }
}
