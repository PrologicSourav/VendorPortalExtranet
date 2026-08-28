import { Component, inject, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute } from "@angular/router";
import { TranslatePipe } from "@ngx-translate/core";
import { MoneyPipe } from "../../pipes/money.pipe";
import { ApiService } from "../../services/api.service";
import { AuthService } from "../../services/auth.service";

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

    <div *ngIf="!hasVendor" class="card notice">
      {{ "invoiceSubmit.noVendorNotice" | translate }}
    </div>

    <!-- Step 1: Select PO/GRN -->
    <div *ngIf="hasVendor && step === 1" class="card">
      <div class="card-header">{{ "invoiceSubmit.selectPo" | translate }}</div>
      <div class="card-body">
        <div *ngIf="loading" class="notice">
          {{ "invoiceSubmit.loading" | translate }}
        </div>
        <div *ngIf="!loading && deliveredPOs.length === 0" class="notice">
          {{ "invoiceSubmit.noInvoiceablePos" | translate }}
        </div>
        <div *ngIf="!loading && preselectedPoNotFound" class="notice error">
          {{ "invoiceSubmit.preselectedPoNotFound" | translate }}
        </div>
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
                [disabled]="busy"
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

      <div *ngIf="toast" class="toast" [ngClass]="'toast-' + toast.type">
        {{ toast.raw ? toast.message : (toast.message | translate) }}
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

      .notice {
        padding: 12px;
        font-size: 13px;
        color: var(--color-text-secondary);
      }
      .notice.error {
        color: var(--color-error);
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
export class InvoiceSubmitComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);

  step = 1;
  /** Set when opened via "Attach Invoice" on a specific PO (?poId=...) but that PO
   *  isn't in the invoiceable list — lets the template explain why nothing preselected. */
  preselectedPoNotFound = false;
  selectedPO: any = null;
  invoiceNumber = "";
  invoiceDate = "";
  currency = "INR";
  selectedFile = "";
  submitted = false;

  loading = false;
  busy = false;
  deliveredPOs: any[] = [];
  invoiceLines: any[] = [];

  get vendorId(): string | null {
    return this.auth.user()?.vendorId ?? null;
  }
  get hasVendor(): boolean {
    return !!this.vendorId;
  }

  ngOnInit(): void {
    const vid = this.vendorId;
    if (!vid) return;
    this.loading = true;
    const preselectPoId = this.route.snapshot.queryParamMap.get("poId");
    // Invoiceable POs = those the buyer has acknowledged or received (delivered).
    this.api.getPurchaseOrders(vid).subscribe({
      next: (res: any) => {
        const items = res?.items ?? res ?? [];
        this.deliveredPOs = items
          .filter((p: any) => p.status === "Delivered" || p.status === "Acknowledged")
          .map((p: any) => ({
            id: p.id,
            poNumber: p.poNumber,
            entity: p.entityName ?? "—",
            property: p.propertyName ?? "",
            deliveryDate: p.requiredByDate
              ? new Date(p.requiredByDate).toLocaleDateString()
              : "",
            value: p.totalValue,
          }));
        this.loading = false;

        // Arrived here via "Attach Invoice" on a specific PO — skip straight to it.
        if (preselectPoId) {
          const match = this.deliveredPOs.find((p) => p.id === preselectPoId);
          if (match) {
            this.selectPo(match);
            this.step = 2;
          } else {
            this.preselectedPoNotFound = true;
          }
        }
      },
      error: () => {
        this.loading = false;
      },
    });
  }

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
    // Pull the PO's line items to prefill expected qty/price for the match.
    this.api.getPurchaseOrder(po.id).subscribe({
      next: (d: any) => {
        this.invoiceLines = (d?.lines ?? []).map((l: any) => ({
          item: l.itemDescription,
          expectedQty: l.qtyOrdered,
          invoicedQty: l.qtyOrdered,
          expectedPrice: l.unitPrice,
          invoicedPrice: l.unitPrice,
        }));
      },
      error: () => {
        this.invoiceLines = [];
      },
    });
  }

  onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) this.selectedFile = input.files[0].name;
  }

  submitInvoice() {
    if (this.busy || !this.selectedPO) return;
    if (!this.invoiceNumber.trim() || !this.invoiceDate) {
      this.showToast("error", "invoiceSubmit.missingFields");
      return;
    }
    this.busy = true;
    const payload = {
      vendorId: this.vendorId,
      purchaseOrderId: this.selectedPO.id,
      invoiceNumber: this.invoiceNumber.trim(),
      invoiceDate: this.invoiceDate,
      currency: this.currency,
      subTotal: this.subtotal,
      taxAmount: this.tax,
      totalAmount: this.total,
      lines: this.invoiceLines.map((l) => ({
        itemDescription: l.item,
        invoicedQty: l.invoicedQty,
        invoicedUnitPrice: l.invoicedPrice,
        expectedQty: l.expectedQty,
        expectedUnitPrice: l.expectedPrice,
        lineTotal: l.invoicedQty * l.invoicedPrice,
      })),
    };
    this.api.createInvoice(payload).subscribe({
      next: (created: any) => {
        this.busy = false;
        // Backend is authoritative on the match outcome.
        const matched = created?.matchStatus === "Matched";
        this.showToast(
          "success",
          matched
            ? "invoiceSubmit.submittedMatched"
            : "invoiceSubmit.submittedMismatch",
        );
      },
      error: (err) => {
        this.busy = false;
        this.showToast("error", this.extractError(err), true);
      },
    });
  }

  // Toast shown at the bottom; `raw` = message is literal text, not a i18n key.
  toast: { type: string; message: string; raw?: boolean } | null = null;
  private showToast(type: string, message: string, raw = false) {
    this.submitted = type === "success";
    this.toast = { type, message, raw };
    setTimeout(() => (this.toast = null), 3500);
  }

  private extractError(err: any): string {
    return (
      err?.error?.error?.message ??
      err?.error?.error ??
      err?.error?.message ??
      err?.message ??
      "Something went wrong. Please try again."
    );
  }
}
