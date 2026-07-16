import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

@Component({
  selector: "app-invoice-submit",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header">
      <h1>Submit Invoice</h1>
      <p class="page-subtitle">
        Submit an invoice against a delivered purchase order
      </p>
    </div>

    <!-- Step 1: Select PO/GRN -->
    <div *ngIf="step === 1" class="card">
      <div class="card-header">Select PO to Invoice Against</div>
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
              <span class="po-date">Delivered: {{ po.deliveryDate }}</span>
            </div>
            <span class="po-value">₹{{ po.value | number }}</span>
          </div>
        </div>
        <button
          class="btn btn-primary"
          [disabled]="!selectedPO"
          (click)="step = 2"
          style="margin-top: 16px"
        >
          Continue
        </button>
      </div>
    </div>

    <!-- Step 2: Invoice Form -->
    <div *ngIf="step === 2">
      <div class="invoice-layout">
        <div class="invoice-main">
          <div class="card">
            <div class="card-header">Invoice Details</div>
            <div class="card-body">
              <div class="form-grid">
                <div class="form-group">
                  <label>Invoice Number</label>
                  <input
                    class="form-control"
                    [(ngModel)]="invoiceNumber"
                    placeholder="INV-2025-001"
                  />
                </div>
                <div class="form-group">
                  <label>Invoice Date</label>
                  <input
                    type="date"
                    class="form-control"
                    [(ngModel)]="invoiceDate"
                  />
                </div>
                <div class="form-group">
                  <label>Currency</label>
                  <select class="form-control" [(ngModel)]="currency">
                    <option value="INR">INR (₹)</option>
                    <option value="AED">AED (د.إ)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div class="card" style="margin-top: 16px">
            <div class="card-header">Line Items</div>
            <div class="card-body">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Expected Qty</th>
                    <th>Invoiced Qty</th>
                    <th>Expected Price</th>
                    <th>Invoiced Price</th>
                    <th>Line Total</th>
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
                    <td>₹{{ line.expectedPrice | number: "1.2-2" }}</td>
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
                      ₹{{
                        line.invoicedQty * line.invoicedPrice | number: "1.2-2"
                      }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="card" style="margin-top: 16px">
            <div class="card-header">Invoice PDF Upload</div>
            <div class="card-body">
              <input
                type="file"
                id="invoiceUpload"
                hidden
                (change)="onFileSelect($event)"
              />
              <label for="invoiceUpload" class="upload-label">
                📎 {{ selectedFile || "Click to upload invoice PDF" }}
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
              {{ isMatched ? "✅ Matched" : "⚠️ Mismatch" }}
            </div>
            <div class="card-body">
              <div *ngIf="isMatched" class="match-status match-ok">
                <p>
                  All invoiced values match the expected amounts from PO + GRN.
                </p>
              </div>
              <div *ngIf="!isMatched" class="match-status match-err">
                <div
                  *ngFor="let reason of mismatchReasons"
                  class="match-reason"
                >
                  ❌ {{ reason }}
                </div>
              </div>
              <div class="match-summary">
                <div class="match-row">
                  <span>Subtotal</span>
                  <span>₹{{ subtotal | number: "1.2-2" }}</span>
                </div>
                <div class="match-row">
                  <span>Tax (18%)</span>
                  <span>₹{{ tax | number: "1.2-2" }}</span>
                </div>
                <div class="match-row total">
                  <span>Total</span>
                  <span>₹{{ total | number: "1.2-2" }}</span>
                </div>
              </div>
              <div class="match-note">
                ℹ️ Invoices that do not match are held and reviewed by Accounts
                Payable before posting — they are not posted automatically.
              </div>
              <button
                class="btn btn-primary btn-block"
                style="margin-top: 16px"
                (click)="submitInvoice()"
              >
                {{
                  isMatched ? "Submit Invoice" : "Submit (AP Review Required)"
                }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div *ngIf="submitted" class="toast toast-success">
        Invoice submitted successfully
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
        color: var(--color-primary);
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
          background: #fafbfc;
        }
        &.selected {
          border-color: var(--color-primary);
          background: #eef2ff;
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
        background: #dcfce7 !important;
        color: #166534 !important;
      }
      .match-header-warn {
        background: #fef3c7 !important;
        color: #92400e !important;
      }
      .match-status {
        margin-bottom: 16px;
        font-size: 13px;
      }
      .match-ok p {
        color: #166534;
      }
      .match-err .match-reason {
        color: #991b1b;
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
        background: #f8fafc;
        border-radius: 6px;
        font-size: 11px;
        color: var(--color-text-secondary);
      }
      .btn-block {
        width: 100%;
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

  get mismatchReasons(): string[] {
    const reasons: string[] = [];
    for (const line of this.invoiceLines) {
      if (line.invoicedQty > line.expectedQty)
        reasons.push(`Qty exceeds received for ${line.item}`);
      if (line.invoicedPrice > line.expectedPrice)
        reasons.push(
          `Unit price higher than PO for ${line.item} by ₹${line.invoicedPrice - line.expectedPrice}`,
        );
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
