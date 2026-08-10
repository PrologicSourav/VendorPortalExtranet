import { Component, OnInit, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import {
  CatalogueReview,
  GovApiService,
} from "../../services/gov-api.service";

/** Maps a UI tab to the catalogue status it lists. */
const TAB_STATUS: Record<string, string> = {
  pending: "Submitted",
  approved: "Approved",
  rejected: "Rejected",
};

@Component({
  selector: "app-catalogue-approvals",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header">
      <h1>Catalogue Approvals</h1>
      <p class="page-subtitle">
        Review and approve supplier catalogue submissions for the property
      </p>
    </div>

    <div class="tabs">
      <div
        class="tab"
        [class.active]="tab === 'pending'"
        (click)="switchTab('pending')"
      >
        Pending
        <span class="count-badge" *ngIf="tab === 'pending' && catalogues.length"
          >{{ catalogues.length }}</span
        >
      </div>
      <div
        class="tab"
        [class.active]="tab === 'approved'"
        (click)="switchTab('approved')"
      >
        Approved
      </div>
      <div
        class="tab"
        [class.active]="tab === 'rejected'"
        (click)="switchTab('rejected')"
      >
        Rejected
      </div>
    </div>

    <div *ngIf="loading" class="loading-state">Loading catalogues…</div>
    <div *ngIf="loadError" class="load-error" role="alert">
      Failed to load catalogues. Please try again.
    </div>

    <div
      *ngFor="let cat of catalogues"
      class="card"
      style="margin-top: 16px"
    >
      <div class="card-header">
        {{ cat.supplierName }} — {{ cat.lineCount }} items
        <span
          class="badge"
          [ngClass]="getStatusBadge(cat.status)"
          style="margin-left: 8px"
          >{{ cat.status }}</span
        >
        <span class="badge badge-muted" style="margin-left: 4px"
          >{{ cat.versionLabel }}</span
        >
      </div>
      <div class="card-body">
        <div class="catalogue-meta">
          <span>Submitted: {{ cat.submittedDate ? (cat.submittedDate | date: "mediumDate") : "—" }}</span>
        </div>

        <table class="data-table" style="margin-top: 12px">
          <thead>
            <tr>
              <th>Item Code</th>
              <th>Description</th>
              <th>Price</th>
              <th>Contract Price</th>
              <th>Deviation</th>
              <th>Web Prol'IFIC Item</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let line of cat.lines">
              <td>
                <code>{{ line.itemCode }}</code>
              </td>
              <td>{{ line.description }}</td>
              <td>{{ line.currency }} {{ line.price | number: "1.2-2" }}</td>
              <td>
                {{
                  line.contractPrice != null
                    ? line.currency + " " + (line.contractPrice | number: "1.2-2")
                    : "—"
                }}
              </td>
              <td>
                <span
                  *ngIf="line.deviationPercent != null; else noDeviation"
                  [class.deviation-high]="line.deviationPercent > 5"
                  [class.deviation-ok]="line.deviationPercent <= 5"
                >
                  {{ line.deviationPercent > 0 ? "+" : "" }}{{ line.deviationPercent | number: "1.0-2" }}%
                </span>
                <ng-template #noDeviation>—</ng-template>
              </td>
              <td>
                <span
                  *ngIf="line.mappedItemCode; else notMapped"
                  class="badge badge-success"
                  [title]="line.mappedItemDescription || ''"
                >
                  {{ line.mappedItemCode }}
                </span>
                <ng-template #notMapped>
                  <span class="badge badge-muted">Unmapped</span>
                </ng-template>
              </td>
            </tr>
          </tbody>
        </table>

        <div *ngIf="cat.status === 'Submitted'" class="catalogue-actions">
          <button
            class="btn btn-primary"
            [disabled]="actingId === cat.id"
            (click)="approve(cat)"
          >
            ✅ Approve All
          </button>
          <button
            class="btn btn-secondary"
            [disabled]="actingId === cat.id"
            (click)="reject(cat)"
          >
            ❌ Reject
          </button>
        </div>
      </div>
    </div>

    <div
      *ngIf="!loading && !loadError && catalogues.length === 0"
      class="card"
      style="margin-top: 16px"
    >
      <div class="empty-state">
        <div class="empty-icon">✅</div>
        <div class="empty-title">No catalogues to review</div>
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
      .loading-state {
        padding: 40px;
        text-align: center;
        color: var(--color-text-secondary);
        font-size: 13px;
      }
      .load-error {
        margin-top: 16px;
        padding: 16px;
        border-radius: 8px;
        background: var(--color-error-soft-bg, #fde8e8);
        color: var(--color-error);
        font-size: 13px;
      }
      code {
        background: var(--color-surface-alt);
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 12px;
      }
      .catalogue-meta {
        display: flex;
        gap: 20px;
        font-size: 12px;
        color: var(--color-text-secondary);
      }
      .deviation-high {
        color: var(--color-error);
        font-weight: 600;
      }
      .deviation-ok {
        color: var(--color-success);
      }
      .catalogue-actions {
        display: flex;
        gap: 10px;
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid var(--color-border-light);
      }
    `,
  ],
})
export class CatalogueApprovalsComponent implements OnInit {
  private govApi = inject(GovApiService);

  tab = "pending";
  catalogues: CatalogueReview[] = [];
  loading = false;
  loadError = false;
  actingId: string | null = null;
  toast: { type: string; message: string } | null = null;

  ngOnInit(): void {
    this.load();
  }

  switchTab(tab: string): void {
    if (this.tab === tab) return;
    this.tab = tab;
    this.load();
  }

  private load(): void {
    this.loading = true;
    this.loadError = false;
    this.govApi.getCataloguesForReview(TAB_STATUS[this.tab]).subscribe({
      next: (rows) => {
        this.catalogues = rows ?? [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.loadError = true;
      },
    });
  }

  getStatusBadge(status: string): string {
    const map: Record<string, string> = {
      Submitted: "badge-warning",
      Approved: "badge-success",
      Rejected: "badge-error",
    };
    return map[status] || "badge-muted";
  }

  approve(cat: CatalogueReview): void {
    this.actingId = cat.id;
    this.govApi.approveCatalogue(cat.id).subscribe({
      next: () => {
        this.actingId = null;
        this.showToast("success", `${cat.supplierName} catalogue approved`);
        this.load();
      },
      error: () => {
        this.actingId = null;
        this.showToast("error", "Could not approve the catalogue. Please try again.");
      },
    });
  }

  reject(cat: CatalogueReview): void {
    const reason = (window.prompt("Reason for rejection (optional):") ?? "").trim();
    this.actingId = cat.id;
    this.govApi.rejectCatalogue(cat.id, reason).subscribe({
      next: () => {
        this.actingId = null;
        this.showToast("error", `${cat.supplierName} catalogue rejected`);
        this.load();
      },
      error: () => {
        this.actingId = null;
        this.showToast("error", "Could not reject the catalogue. Please try again.");
      },
    });
  }

  private showToast(type: string, message: string): void {
    this.toast = { type, message };
    setTimeout(() => (this.toast = null), 3000);
  }
}
