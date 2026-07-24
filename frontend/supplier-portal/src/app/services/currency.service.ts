import { Injectable, signal, computed } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { environment } from "../../environments/environment";

export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  decimalPrecision: number;
}

interface ExchangeRatesResponse {
  baseCurrency: string;
  asOf: string;
  rates: Record<string, number>;
}

/**
 * Application base currency: all monetary values stored/entered in the app are
 * treated as INR, and converted to the user's selected display currency.
 */
const BASE_CURRENCY = "INR";

@Injectable({ providedIn: "root" })
export class CurrencyService {
  private readonly _selectedCurrency = signal<string>(
    localStorage.getItem("wp_cur") ?? BASE_CURRENCY,
  );
  readonly selectedCurrency = this._selectedCurrency.asReadonly();

  /** base -> target conversion factors (base currency maps to 1). */
  private readonly _rates = signal<Record<string, number>>({
    [BASE_CURRENCY]: 1,
  });
  readonly rates = this._rates.asReadonly();

  private readonly _currencies = signal<CurrencyInfo[]>([]);
  readonly currencies = this._currencies.asReadonly();

  readonly baseCurrency = BASE_CURRENCY;

  /** True once we have a rate for the selected currency (or it's the base). */
  readonly hasRate = computed(() => {
    const code = this._selectedCurrency();
    return code === BASE_CURRENCY || this._rates()[code] != null;
  });

  constructor(private http: HttpClient) {}

  setCurrency(code: string): void {
    this._selectedCurrency.set(code);
    localStorage.setItem("wp_cur", code);
  }

  getAvailableCurrencies() {
    // Lives on ConfigurationController, not its own controller — was 404ing
    // against the non-existent /currencies (no such top-level route exists).
    return this.http.get<CurrencyInfo[]>(
      `${environment.apiUrl}/configuration/currencies`,
    );
  }

  /**
   * Loads the currency list and current exchange rates. Call after login (the
   * endpoints require auth). Failures are swallowed — the app keeps working in
   * the base currency.
   */
  loadReferenceData(): void {
    this.getAvailableCurrencies().subscribe({
      next: (list) => this._currencies.set(list ?? []),
      error: () => {},
    });
    this.http
      .get<ExchangeRatesResponse>(
        `${environment.apiUrl}/configuration/exchange-rates?base=${BASE_CURRENCY}`,
      )
      .subscribe({
        next: (res) =>
          this._rates.set({ [BASE_CURRENCY]: 1, ...(res?.rates ?? {}) }),
        error: () => {},
      });
  }

  /** Convert a base-currency (INR) amount to the selected currency, or null if no rate. */
  convertFromBase(amountInBase: number): number | null {
    const code = this._selectedCurrency();
    if (code === BASE_CURRENCY) return amountInBase;
    const rate = this._rates()[code];
    return rate != null ? amountInBase * rate : null;
  }

  decimalPrecisionFor(code: string): number {
    const found = this._currencies().find((c) => c.code === code);
    return found ? found.decimalPrecision : code === "VND" ? 0 : 2;
  }
}
