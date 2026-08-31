import { Component, OnInit, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { GovApiService, VendorRequestQueueItem } from "../../services/gov-api.service";

@Component({
  selector: "app-vendor-requests",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header">
      <h1>Vendor Access Requests</h1>
      <p class="page-subtitle">
        A vendor never gets access to a new Chain/Property just by asking —
        approving here is what actually creates the relationship.
      </p>
    </div>

    <div class="tabs">
      <div class="tab" [class.active]="statusFilter === 'Pending'" (click)="switchTab('Pending')">Pending</div>
      <div class="tab" [class.active]="statusFilter === 'Approved'" (click)="switchTab('Approved')">Approved</div>
      <div class="tab" [class.active]="statusFilter === 'Rejected'" (click)="switchTab('Rejected')">Rejected</div>
    </div>

    <div *ngIf="loading" class="loading-state">Loading…</div>

    <div class="card" *ngIf="!loading">
      <table class="data-table">
        <thead>
          <tr>
            <th>Vendor</th>
            <th>Requested</th>
            <th>Scope</th>
            <th>Date</th>
            <th *ngIf="statusFilter === 'Pending'"></th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let r of requests">
            <td>{{ r.vendorName }}</td>
            <td>{{ r.buyingEntityName }}{{ r.propertyName ? " / " + r.propertyName : " (entire chain)" }}</td>
            <td>{{ r.requestType }}</td>
            <td>{{ r.requestedDate | date: "mediumDate" }}</td>
            <td *ngIf="statusFilter === 'Pending'" class="actions">
              <button class="btn btn-sm btn-primary" [disabled]="busyId === r.id" (click)="approve(r)">
                Approve
              </button>
              <button class="btn btn-sm btn-danger" [disabled]="busyId === r.id" (click)="reject(r)">
                Reject
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <div *ngIf="requests.length === 0" class="empty-state">
        <div class="empty-title">Nothing here</div>
      </div>
    </div>

    <div *ngIf="toast" class="toast" [ngClass]="'toast-' + toast.type">{{ toast.message }}</div>
  `,
  styles: [
    `
      .page-header { margin-bottom: 20px; }
      .page-header h1 { font-size: 22px; font-weight: 700; color: var(--color-primary); }
      .page-subtitle { font-size: 13px; color: var(--color-text-secondary); margin-top: 4px; max-width: 640px; }
      .actions { display: flex; gap: 8px; }
      .btn-sm { padding: 4px 10px; font-size: 12px; }
      .loading-state { padding: 40px; text-align: center; color: var(--color-text-secondary); font-size: 13px; }
      .empty-state { padding: 16px 4px; color: var(--color-text-muted); font-size: 13px; }
    `,
  ],
})
export class VendorRequestsComponent implements OnInit {
  private govApi = inject(GovApiService);

  statusFilter: "Pending" | "Approved" | "Rejected" = "Pending";
  requests: VendorRequestQueueItem[] = [];
  loading = false;
  busyId: string | null = null;
  toast: { type: string; message: string } | null = null;

  ngOnInit(): void {
    this.load();
  }

  switchTab(status: "Pending" | "Approved" | "Rejected"): void {
    if (this.statusFilter === status) return;
    this.statusFilter = status;
    this.load();
  }

  private load(): void {
    this.loading = true;
    this.govApi.getVendorRequestQueue(this.statusFilter).subscribe({
      next: (rows) => {
        this.requests = rows ?? [];
        this.loading = false;
      },
      error: () => {
        this.requests = [];
        this.loading = false;
      },
    });
  }

  approve(r: VendorRequestQueueItem): void {
    this.busyId = r.id;
    this.govApi.approveVendorRequest(r.id).subscribe({
      next: () => {
        this.busyId = null;
        this.showToast("success", `Approved — ${r.vendorName} now has access.`);
        this.load();
      },
      error: () => {
        this.busyId = null;
        this.showToast("error", "Could not approve the request.");
      },
    });
  }

  reject(r: VendorRequestQueueItem): void {
    this.busyId = r.id;
    this.govApi.rejectVendorRequest(r.id).subscribe({
      next: () => {
        this.busyId = null;
        this.showToast("success", "Request rejected.");
        this.load();
      },
      error: () => {
        this.busyId = null;
        this.showToast("error", "Could not reject the request.");
      },
    });
  }

  private showToast(type: string, message: string): void {
    this.toast = { type, message };
    setTimeout(() => (this.toast = null), 3000);
  }
}
