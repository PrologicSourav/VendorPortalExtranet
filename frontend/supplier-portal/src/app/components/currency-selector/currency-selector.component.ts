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
  template: `
    <div class="currency-selector">
      <select [value]="selectedCurrency()" (change)="onChange($event)">
        @for (cur of options(); track cur.code) {
          <option [value]="cur.code" [title]="cur.name">{{ cur.code }}</option>
        }
      </select>
    </div>
  `,
  styles: [
    `
      .currency-selector {
        display: flex;
        align-items: center;
      }
      select {
        padding: 6px 10px;
        border-radius: 4px;
        border: 1px solid var(--color-border, #ccc);
        background: var(--color-surface, #fff);
        color: var(--color-text, inherit);
      }
    `,
  ],
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
