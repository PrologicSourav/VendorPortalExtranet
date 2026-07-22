import { Pipe, PipeTransform } from "@angular/core";
import { DecimalPipe } from "@angular/common";
import { TranslateService } from "@ngx-translate/core";

@Pipe({
  name: "localeCurrency",
  pure: false,
})
export class LocaleCurrencyPipe implements PipeTransform {
  private decimalPipe = new DecimalPipe("en-US");

  constructor(private translate: TranslateService) {}

  transform(value: number, currencyCode: string = "INR"): string {
    if (value == null) return "";
    const locale = this.translate.currentLang() || "en";
    const formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: this.getPrecision(currencyCode),
    });
    return formatter.format(value);
  }

  private getPrecision(currency: string): number {
    // Simple map; can be loaded from API if needed
    const map: Record<string, number> = {
      USD: 2,
      EUR: 2,
      GBP: 2,
      INR: 2,
      AED: 2,
      VND: 0,
      THB: 2,
    };
    return map[currency] ?? 2;
  }
}
