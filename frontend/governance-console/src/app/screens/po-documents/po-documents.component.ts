import { Component, OnInit, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import {
  GovApiService,
  PurchaseOrderSummary,
} from "../../services/gov-api.service";

@Component({
  selector: "app-po-documents",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header">
      <h1>Purchase Order Documents</h1>
      <p class="page-subtitle">
        Upload the printed PO (the PDF the property produced) so the supplier can
        see the exact document in their portal.
      </p>
    </div>

    <div class="search-bar">
      <input
        type="text"
        class="form-control search-input"
        placeholder="Search by PO number or supplier..."
        [(ngModel)]="searchTerm"
        (ngModelChange)="onSearchChange($event)"
      />
    </div>

    <div *ngIf="loading" class="loading-state">Loading purchase orders…</div>
    <div *ngIf="loadError" class="load-error" role="alert">
      Failed to load purchase orders. Please try again.
    </div>

    <div class="card" *ngIf="!loading && !loadError">
      <table class="data-table">
        <thead>
          <tr>
            <th>PO Number</th>
            <th>Supplier</th>
            <th>Property</th>
            <th>Order Date</th>
            <th>Value</th>
            <th>Status</th>
            <th>Document</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let po of purchaseOrders">
            <td><code>{{ po.poNumber }}</code></td>
            <td>{{ po.vendorName }}</td>
            <td>{{ po.propertyName || "—" }}</td>
            <td>{{ po.orderDate | date: "mediumDate" }}</td>
            <td>{{ po.transactionCurrencyCode }} {{ po.totalValue | number: "1.2-2" }}</td>
            <td><span class="badge badge-muted">{{ po.status }}</span></td>
            <td>
              <span *ngIf="po.hasPrintedDocument; else noDoc" class="badge badge-success">
                {{ po.printedDocumentFileName }}
              </span>
              <ng-template #noDoc>
                <span class="badge badge-warning">Not uploaded</span>
              </ng-template>
            </td>
            <td>
              <input
                type="file"
                accept="application/pdf"
                #fileInput
                style="display:none"
                (change)="onFileSelected(po, fileInput.files)"
              />
              <button
                class="btn btn-sm btn-secondary"
                [disabled]="uploadingId === po.id"
                (click)="fileInput.click()"
              >
                {{ uploadingId === po.id ? "Uploading…" : (po.hasPrintedDocument ? "Replace" : "Upload PDF") }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <div *ngIf="purchaseOrders.length === 0" class="empty-state">
        <div class="empty-icon">📋</div>
        <div class="empty-title">No purchase orders found</div>
      </div>
    </div>

    <div *ngIf="toast" class="toast" [ngClass]="'toast-' + toast.type">
      {{ toast.message }}
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
      .search-bar {
        margin-bottom: 16px;
      }
      .search-input {
        width: 320px;
      }
      .loading-state {
        padding: 40px;
        text-align: center;
        color: var(--color-text-secondary);
        font-size: 13px;
      }
      .load-error {
        padding: 16px;
        border-radius: 8px;
        background: var(--color-error-soft-bg, #fde8e8);
        color: var(--color-error);
        font-size: 13px;
        margin-bottom: 16px;
      }
      code {
        background: var(--color-surface-alt);
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 12px;
      }
      .btn-sm {
        padding: 4px 10px;
        font-size: 12px;
      }
    `,
  ],
})
export class PoDocumentsComponent implements OnInit {
  private govApi = inject(GovApiService);

  searchTerm = "";
  purchaseOrders: PurchaseOrderSummary[] = [];
  loading = false;
  loadError = false;
  uploadingId: string | null = null;
  toast: { type: string; message: string } | null = null;

  private searchDebounce: any;

  ngOnInit(): void {
    this.load();
  }

  onSearchChange(_value: string): void {
    clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => this.load(), 300);
  }

  private load(): void {
    this.loading = true;
    this.loadError = false;
    this.govApi.searchPurchaseOrders(this.searchTerm || undefined).subscribe({
      next: (res) => {
        this.purchaseOrders = res.items ?? [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.loadError = true;
      },
    });
  }

  onFileSelected(po: PurchaseOrderSummary, files: FileList | null): void {
    const file = files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      this.showToast("error", "Only PDF files are accepted.");
      return;
    }
    this.uploadingId = po.id;
    this.govApi.uploadPoDocument(po.id, file).subscribe({
      next: () => {
        this.uploadingId = null;
        this.showToast("success", `Document uploaded for ${po.poNumber}.`);
        this.load();
      },
      error: (err) => {
        this.uploadingId = null;
        this.showToast(
          "error",
          err?.error?.message ?? "Could not upload the document. Please try again.",
        );
      },
    });
  }

  private showToast(type: string, message: string): void {
    this.toast = { type, message };
    setTimeout(() => (this.toast = null), 3000);
  }
}
