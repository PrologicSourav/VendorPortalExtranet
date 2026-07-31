import { Pipe, PipeTransform } from "@angular/core";
import { TranslateService } from "@ngx-translate/core";
import { CurrencyService } from "../services/currency.service";

/**
 * Finds monetary amounts inside free-text (e.g. a notification message), treats
 * them as base-currency (INR) values, and rewrites them in the user's selected
 * display currency — so notification amounts convert with the currency switch,
 * consistent with the `money` pipe used across the app.
 *
 * Matches comma-grouped amounts (Western 84,000 and Indian lakh 1,89,500) and
 * per-unit rates (15/kg). Leaves PO codes, dates and version numbers untouched.
 * Impure so it re-evaluates when the selected currency / rates change.
 */
@Pipe({ name: "amountsToCurrency", standalone: true, pure: false })
export class AmountsToCurrencyPipe implements PipeTransform {
  constructor(
    private currency: CurrencyService,
    private translate: TranslateService,
  ) {}

  transform(text: string | null | undefined): string {
    if (!text) return text ?? "";
    const locale = this.translate.currentLang() || "en";

    const format = (amountInBase: number): string => {
      const converted = this.currency.convertFromBase(amountInBase);
      const code = converted != null ? this.currency.selectedCurrency() : this.currency.baseCurrency;
      const value = converted != null ? converted : amountInBase;
      const digits = this.currency.decimalPrecisionFor(code);
      try {
        return new Intl.NumberFormat(locale, {
          style: "currency",
          currency: code,
          minimumFractionDigits: digits,
          maximumFractionDigits: digits,
        }).format(value);
      } catch {
        return `${code} ${value.toFixed(2)}`;
      }
    };

    return text
      .replace(/(?<![\w./-])(\d{1,3}(?:,\d{2,3})+(?:\.\d+)?)/g, (m) =>
        format(parseFloat(m.replace(/,/g, ""))),
      )
      .replace(
        /(?<![\w.,/-])(\d+(?:\.\d+)?)(\s*\/\s*(?:kg|g|l|ml|unit|pc|pcs|nos))/gi,
        (_all, num, unit) => format(parseFloat(num)) + unit,
      );
  }
}
