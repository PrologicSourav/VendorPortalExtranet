import { Injectable, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { environment } from "../../environments/environment";

export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  decimalPrecision: number;
}

@Injectable({ providedIn: "root" })
export class CurrencyService {
  private readonly _selectedCurrency = signal<string>(
    localStorage.getItem("wp_cur") ?? "INR",
  );
  readonly selectedCurrency = this._selectedCurrency.asReadonly();

  constructor(private http: HttpClient) {}

  setCurrency(code: string): void {
    this._selectedCurrency.set(code);
    localStorage.setItem("wp_cur", code);
  }

  getAvailableCurrencies() {
    return this.http.get<CurrencyInfo[]>(`${environment.apiUrl}/currencies`);
  }
}
