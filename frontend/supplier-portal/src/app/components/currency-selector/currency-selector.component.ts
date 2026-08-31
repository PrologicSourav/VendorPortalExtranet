import { Component, inject } from "@angular/core";
import { CurrencyService, CurrencyInfo } from "../../services/currency.service";

const FALLBACK: CurrencyInfo[] = [
  { code: "INR", name: "Indian Rupee", symbol: "₹", decimalPrecision: 2 },
  { code: "USD", name: "US Dollar", symbol: "$", decimalPrecision: 2 },
  { code: "EUR", name: "Euro", symbol: "€", decimalPrecision: 2 },
];

@Component({
  selector: "currency-selector",
  standalone: true,
  imports: [],
  templateUrl: "./currency-selector.component.html",
  styleUrl: "./currency-selector.component.css",
})
export class CurrencySelectorComponent {
  private currencyService = inject(CurrencyService);

  selectedCurrency = this.currencyService.selectedCurrency;

  options(): CurrencyInfo[] {
    const list = this.currencyService.currencies();
    return list.length ? list : FALLBACK;
  }

  onChange(event: Event): void {
    const code = (event.target as HTMLSelectElement).value;
    // Reactive: the impure `money` pipe re-renders prices — no page reload needed.
    this.currencyService.setCurrency(code);
  }
}
