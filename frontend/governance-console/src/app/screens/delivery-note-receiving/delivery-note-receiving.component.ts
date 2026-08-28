import { Component, OnInit, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import {
  DeliveryNoteSummary,
  GovApiService,
} from "../../services/gov-api.service";

const TAB_STATUS: Record<string, string> = {
  pending: "Submitted",
  received: "Received",
};

@Component({
  selector: "app-delivery-note-receiving",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header">
      <h1>Delivery Note Receiving</h1>
      <p class="page-subtitle">
        Confirm goods physically received against a supplier's delivery note.
      </p>
    </div>

    <div class="tabs">
      <div class="tab" [class.active]="tab === 'pending'" (click)="switchTab('pending')">
        Pending Receipt
        <span class="count-badge" *ngIf="tab === 'pending' && notes.length">{{ notes.length }}</span>
      </div>
      <div class="tab" [class.active]="tab === 'received'" (click)="switchTab('received')">
        Received
      </div>
    </div>

    <div class="search-bar">
      <input
        type="text"
        class="form-control search-input"
        placeholder="Search by DN number, PO number, or supplier..."
        [(ngModel)]="searchTerm"
        (ngModelChange)="onSearchChange($event)"
      />
    </div>

    <div *ngIf="loading" class="loading-state">Loading delivery notes…</div>
    <div *ngIf="loadError" class="load-error" role="alert">
      Failed to load delivery notes. Please try again.
    </div>

    <div class="card" *ngIf="!loading && !loadError">
      <table class="data-table">
        <thead>
          <tr>
            <th>DN Number</th>
            <th>PO Number</th>
            <th>Supplier</th>
            <th>Expected Delivery</th>
            <th>Lines</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let dn of notes">
            <td><code>{{ dn.deliveryNoteNumber }}</code></td>
            <td><code>{{ dn.poNumber }}</code></td>
            <td>{{ dn.vendorName }}</td>
            <td>{{ dn.expectedDeliveryDate | date: "mediumDate" }}</td>
            <td>{{ dn.lineCount }}</td>
            <td><span class="badge" [ngClass]="getStatusBadge(dn.status)">{{ dn.status }}</span></td>
            <td>
              <button
                *ngIf="dn.status === 'Submitted'"
                class="btn btn-sm btn-primary"
                [disabled]="receivingId === dn.id"
                (click)="markReceived(dn)"
              >
                {{ receivingId === dn.id ? "Confirming…" : "Mark Received" }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <div *ngIf="notes.length === 0" class="empty-state">
        <div class="empty-icon">📦</div>
        <div class="empty-title">No delivery notes found</div>
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
      .count-badge {
        background: var(--color-accent);
        color: white;
        font-size: 10px;
        padding: 1px 7px;
        border-radius: 99px;
        margin-left: 6px;
      }
      .search-bar {
        margin: 16px 0;
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
export class DeliveryNoteReceivingComponent implements OnInit {
  private govApi = inject(GovApiService);

  tab = "pending";
  searchTerm = "";
  notes: DeliveryNoteSummary[] = [];
  loading = false;
  loadError = false;
  receivingId: string | null = null;
  toast: { type: string; message: string } | null = null;

  private searchDebounce: any;

  ngOnInit(): void {
    this.load();
  }

  switchTab(tab: string): void {
    if (this.tab === tab) return;
    this.tab = tab;
    this.load();
  }

  onSearchChange(_value: string): void {
    clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => this.load(), 300);
  }

  private load(): void {
    this.loading = true;
    this.loadError = false;
    this.govApi.searchDeliveryNotes(TAB_STATUS[this.tab], this.searchTerm || undefined).subscribe({
      next: (res) => {
        this.notes = res.items ?? [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.loadError = true;
      },
    });
  }

  markReceived(dn: DeliveryNoteSummary): void {
    this.receivingId = dn.id;
    this.govApi.receiveDeliveryNote(dn.id).subscribe({
      next: () => {
        this.receivingId = null;
        this.showToast("success", `${dn.deliveryNoteNumber} marked received.`);
        this.load();
      },
      error: (err) => {
        this.receivingId = null;
        this.showToast(
          "error",
          err?.error?.message ?? "Could not mark this delivery note received.",
        );
      },
    });
  }

  getStatusBadge(status: string): string {
    const map: Record<string, string> = {
      Draft: "badge-muted",
      Submitted: "badge-warning",
      Received: "badge-success",
    };
    return map[status] || "badge-muted";
  }

  private showToast(type: string, message: string): void {
    this.toast = { type, message };
    setTimeout(() => (this.toast = null), 3000);
  }
}
