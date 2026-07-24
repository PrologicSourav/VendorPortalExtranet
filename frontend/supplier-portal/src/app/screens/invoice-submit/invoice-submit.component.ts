import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { TranslatePipe } from "@ngx-translate/core";
import { MoneyPipe } from "../../pipes/money.pipe";

@Component({
  selector: "app-invoice-submit",
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, MoneyPipe],
  template: `
    <div class="page-header">
      <h1>{{ "invoiceSubmit.title" | translate }}</h1>
      <p class="page-subtitle">
        {{ "invoiceSubmit.subtitle" | translate }}
      </p>
    </div>

    <!-- Step 1: Select PO/GRN -->
    <div *ngIf="step === 1" class="card">
      <div class="card-header">{{ "invoiceSubmit.selectPo" | translate }}</div>
      <div class="card-body">
        <div class="po-select-list">
          <div
            *ngFor="let po of deliveredPOs"
            class="po-select-item"
            (click)="selectPo(po)"
            [class.selected]="selectedPO?.id === po.id"
          >
            <div class="po-info">
              <span class="po-number">{{ po.poNumber }}</span>
              <span class="po-entity">{{ po.entity }} · {{ po.property }}</span>
              <span class="po-date">{{
                "invoiceSubmit.delivered" | translate: { date: po.deliveryDate }
              }}</span>
            </div>
            <span class="po-value">{{ po.value | money }}</span>
          </div>
        </div>
        <button
          class="btn btn-primary"
          [disabled]="!selectedPO"
          (click)="step = 2"
          style="margin-top: 16px"
        >
          {{ "invoiceSubmit.continue" | translate }}
        </button>
      </div>
    </div>

    <!-- Step 2: Invoice Form -->
    <div *ngIf="step === 2">
      <div class="invoice-layout">
        <div class="invoice-main">
          <div class="card">
            <div class="card-header">{{ "invoiceSubmit.invoiceDetails" | translate }}</div>
            <div class="card-body">
              <div class="form-grid">
                <div class="form-group">
                  <label>{{ "invoiceSubmit.invoiceNumber" | translate }}</label>
                  <input
                    class="form-control"
                    [(ngModel)]="invoiceNumber"
                    placeholder="INV-2025-001"
                  />
                </div>
                <div class="form-group">
                  <label>{{ "invoiceSubmit.invoiceDate" | translate }}</label>
                  <input
                    type="date"
                    class="form-control"
                    [(ngModel)]="invoiceDate"
                  />
                </div>
                <div class="form-group">
                  <label>{{ "invoiceSubmit.currency" | translate }}</label>
                  <select class="form-control" [(ngModel)]="currency">
                    <option value="INR">INR (₹)</option>
                    <option value="AED">AED (د.إ)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div class="card" style="margin-top: 16px">
            <div class="card-header">{{ "invoiceSubmit.lineItems" | translate }}</div>
            <div class="card-body">
              <div class="table-wrap">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>{{ "invoiceSubmit.item" | translate }}</th>
                      <th>{{ "invoiceSubmit.expectedQty" | translate }}</th>
                      <th>{{ "invoiceSubmit.invoicedQty" | translate }}</th>
                      <th>{{ "invoiceSubmit.expectedPrice" | translate }}</th>
                      <th>{{ "invoiceSubmit.invoicedPrice" | translate }}</th>
                      <th>{{ "invoiceSubmit.lineTotal" | translate }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let line of invoiceLines">
                      <td>{{ line.item }}</td>
                      <td>{{ line.expectedQty }}</td>
                      <td>
                        <input
                          type="number"
                          class="form-control inline-input"
                          [(ngModel)]="line.invoicedQty"
                          min="0"
                        />
                      </td>
                      <td>{{ line.expectedPrice | money }}</td>
                      <td>
                        <input
                          type="number"
                          class="form-control inline-input"
                          [(ngModel)]="line.invoicedPrice"
                          min="0"
                          step="0.01"
                        />
                      </td>
                      <td>
                        {{ line.invoicedQty * line.invoicedPrice | money }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div class="card" style="margin-top: 16px">
            <div class="card-header">{{ "invoiceSubmit.pdfUpload" | translate }}</div>
            <div class="card-body">
              <input
                type="file"
                id="invoiceUpload"
                hidden
                (change)="onFileSelect($event)"
              />
              <label for="invoiceUpload" class="upload-label">
                📎 {{ selectedFile || ("invoiceSubmit.clickToUpload" | translate) }}
              </label>
            </div>
          </div>
        </div>

        <!-- Match Status Panel -->
        <div class="match-panel">
          <div class="card">
            <div
              class="card-header"
              [ngClass]="isMatched ? 'match-header-ok' : 'match-header-warn'"
            >
              {{ isMatched ? ("✅ " + ("invoiceSubmit.matched" | translate)) : ("⚠️ " + ("invoiceSubmit.mismatch" | translate)) }}
            </div>
            <div class="card-body">
              <div *ngIf="isMatched" class="match-status match-ok">
                <p>
                  {{ "invoiceSubmit.matchedMessage" | translate }}
                </p>
              </div>
              <div *ngIf="!isMatched" class="match-status match-err">
                <div
                  *ngFor="let reason of mismatchReasons"
                  class="match-reason"
                >
                  ❌ {{ reason.key | translate: reason.params }}
                </div>
              </div>
              <div class="match-summary">
                <div class="match-row">
                  <span>{{ "invoiceSubmit.subtotal" | translate }}</span>
                  <span>{{ subtotal | money }}</span>
                </div>
                <div class="match-row">
                  <span>{{ "invoiceSubmit.tax" | translate }}</span>
                  <span>{{ tax | money }}</span>
                </div>
                <div class="match-row total">
                  <span>{{ "invoiceSubmit.total" | translate }}</span>
                  <span>{{ total | money }}</span>
                </div>
              </div>
              <div class="match-note">
                ℹ️ {{ "invoiceSubmit.matchNote" | translate }}
              </div>
              <button
                class="btn btn-primary btn-block"
                style="margin-top: 16px"
                (click)="submitInvoice()"
              >
                {{
                  (isMatched ? "invoiceSubmit.submitInvoice" : "invoiceSubmit.submitApReview") | translate
                }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div *ngIf="submitted" class="toast toast-success">
        {{ "invoiceSubmit.submittedToast" | translate }}
      </div>
    </div>
  `,
  styles: [
    `
      .page-header {
        margin-bottom: 20px;
      }
      .page-header h1 {
        font-size: 22px;
        font-weight: 700;
        color: var(--color-heading);
      }
      .page-subtitle {
        font-size: 13px;
        color: var(--color-text-secondary);
        margin-top: 4px;
      }

      .po-select-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .po-select-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 14px 16px;
        border: 1px solid var(--color-border);
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.15s;
        &:hover {
          border-color: var(--color-primary);
          background: var(--color-surface-hover);
        }
        &.selected {
          border-color: var(--color-primary);
          background: var(--color-surface-active);
        }
      }
      .po-number {
        font-weight: 600;
        font-size: 13px;
        display: block;
      }
      .po-entity {
        font-size: 12px;
        color: var(--color-text-secondary);
      }
      .po-date {
        font-size: 11px;
        color: var(--color-text-muted);
      }
      .po-value {
        font-weight: 600;
        font-size: 14px;
      }

      .invoice-layout {
        display: grid;
        grid-template-columns: 1fr 360px;
        gap: 20px;
      }
      @media (max-width: 1024px) {
        .invoice-layout {
          grid-template-columns: 1fr;
        }
      }
      .inline-input {
        width: 100px;
        padding: 6px 8px;
        font-size: 12px;
      }
      .table-wrap {
        overflow-x: auto;
      }
      .form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 16px;
      }

      .upload-label {
        cursor: pointer;
        font-size: 13px;
        color: var(--color-text-secondary);
        display: block;
        padding: 12px;
        border: 1px dashed var(--color-border);
        border-radius: 6px;
        text-align: center;
      }

      .match-panel .card {
        position: sticky;
        top: 80px;
      }
      .match-header-ok {
        background: var(--color-success-soft-bg) !important;
        color: var(--color-success-soft-text) !important;
      }
      .match-header-warn {
        background: var(--color-warning-soft-bg) !important;
        color: var(--color-warning-soft-text) !important;
      }
      .match-status {
        margin-bottom: 16px;
        font-size: 13px;
      }
      .match-ok p {
        color: var(--color-success-soft-text);
      }
      .match-err .match-reason {
        color: var(--color-error-soft-text);
        padding: 4px 0;
        font-size: 12px;
      }
      .match-row {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
        border-bottom: 1px solid var(--color-border-light);
        font-size: 13px;
      }
      .match-row.total {
        font-weight: 700;
        font-size: 16px;
        border-bottom: none;
        padding-top: 12px;
      }
      .match-note {
        margin-top: 16px;
        padding: 10px;
        background: var(--color-surface-alt);
        border-radius: 6px;
        font-size: 11px;
        color: var(--color-text-secondary);
      }
      .btn-block {
        width: 100%;
      }

      @media (max-width: 768px) {
        .form-grid {
          grid-template-columns: 1fr;
        }
        .invoice-layout {
          grid-template-columns: 1fr !important;
        }
        .inline-input {
          width: 80px;
        }
        .po-select-item {
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
        }
      }

      @media (max-width: 640px) {
        .form-grid {
          grid-template-columns: 1fr;
        }
        .invoice-layout {
          grid-template-columns: 1fr !important;
        }
        .inline-input {
          width: 100% !important;
        }
        .po-select-item {
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
        }
        .match-panel .card {
          position: static;
          top: auto;
        }
      }
    `,
  ],
})
export class InvoiceSubmitComponent {
  step = 1;
  selectedPO: any = null;
  invoiceNumber = "";
  invoiceDate = "";
  currency = "INR";
  selectedFile = "";
  submitted = false;

  deliveredPOs = [
    {
      id: "1",
      poNumber: "PO-20250702-002",
      entity: "Accor — North India",
      property: "Novotel Mumbai",
      deliveryDate: "Jul 10, 2025",
      value: 49500,
    },
    {
      id: "2",
      poNumber: "PO-20250704-004",
      entity: "Taj Hotels — West",
      property: "Taj Palace Mumbai",
      deliveryDate: "Jul 12, 2025",
      value: 126000,
    },
  ];

  invoiceLines = [
    {
      item: "Sunflower Oil 15L",
      expectedQty: 30,
      invoicedQty: 30,
      expectedPrice: 1650,
      invoicedPrice: 1650,
    },
    {
      item: "Basmati Rice 25kg",
      expectedQty: 30,
      invoicedQty: 30,
      expectedPrice: 2800,
      invoicedPrice: 2815,
    },
  ];

  get subtotal(): number {
    return this.invoiceLines.reduce(
      (sum, l) => sum + l.invoicedQty * l.invoicedPrice,
      0,
    );
  }

  get tax(): number {
    return this.subtotal * 0.18;
  }
  get total(): number {
    return this.subtotal + this.tax;
  }

  get mismatchReasons(): { key: string; params: Record<string, unknown> }[] {
    const reasons: { key: string; params: Record<string, unknown> }[] = [];
    for (const line of this.invoiceLines) {
      if (line.invoicedQty > line.expectedQty)
        reasons.push({
          key: "invoiceSubmit.mismatchQtyExceeds",
          params: { item: line.item },
        });
      if (line.invoicedPrice > line.expectedPrice)
        reasons.push({
          key: "invoiceSubmit.mismatchPriceHigher",
          params: {
            item: line.item,
            diff: line.invoicedPrice - line.expectedPrice,
          },
        });
    }
    return reasons;
  }

  get isMatched(): boolean {
    return this.mismatchReasons.length === 0;
  }

  selectPo(po: any) {
    this.selectedPO = po;
  }

  onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) this.selectedFile = input.files[0].name;
  }

  submitInvoice() {
    this.submitted = true;
  }
}
