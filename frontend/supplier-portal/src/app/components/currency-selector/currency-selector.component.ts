import { Component, inject } from "@angular/core";
import { CurrencyService } from "../../services/currency.service";
import { catchError, of } from "rxjs";

@Component({
  selector: "currency-selector",
  standalone: true,
  imports: [],
  template: `
    <div class="currency-selector">
      <select [value]="selectedCurrency()" (change)="onChange($event)">
        @for (cur of currencies; track cur.code) {
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
        border: 1px solid #ccc;
      }
    `,
  ],
})
export class CurrencySelectorComponent {
  private currencyService = inject(CurrencyService);
  currencies: any[] = [];

  constructor() {
    this.currencyService
      .getAvailableCurrencies()
      .pipe(
        catchError(() => {
          // Fallback list of common currencies
          return of([
            { code: "INR", name: "Indian Rupee" },
            { code: "USD", name: "US Dollar" },
            { code: "EUR", name: "Euro" },
          ]);
        }),
      )
      .subscribe((list: any[]) => (this.currencies = list));
  }

  selectedCurrency(): string {
    return this.currencyService.selectedCurrency();
  }

  onChange(event: Event): void {
    const code = (event.target as HTMLSelectElement).value;
    this.currencyService.setCurrency(code);
    // optionally refresh UI or trigger reload
    window.location.reload();
  }
}
