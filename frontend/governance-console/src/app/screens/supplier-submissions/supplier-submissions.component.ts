import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

@Component({
  selector: "app-supplier-submissions",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header">
      <h1>Supplier Submissions</h1>
      <p class="page-subtitle">
        Review and manage all supplier submissions across the platform
      </p>
    </div>

    <div class="tabs">
      <div
        class="tab"
        [class.active]="tab === 'pending'"
        (click)="tab = 'pending'"
      >
        Pending Review <span class="count-badge">3</span>
      </div>
      <div
        class="tab"
        [class.active]="tab === 'approved'"
        (click)="tab = 'approved'"
      >
        Approved
      </div>
      <div
        class="tab"
        [class.active]="tab === 'rejected'"
        (click)="tab = 'rejected'"
      >
        Rejected
      </div>
    </div>

    <div class="card" style="margin-top: 16px">
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Supplier</th>
              <th>Submission Type</th>
              <th>Entity</th>
              <th>Submitted</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let sub of filteredSubmissions">
              <td>
                <strong>{{ sub.supplier }}</strong>
              </td>
              <td>
                <span class="badge" [ngClass]="getTypeBadge(sub.type)">{{
                  sub.type
                }}</span>
              </td>
              <td>{{ sub.entity }}</td>
              <td>{{ sub.submitted }}</td>
              <td>
                <span class="badge" [ngClass]="getStatusBadge(sub.status)">{{
                  sub.status
                }}</span>
              </td>
              <td>
                <div class="action-buttons">
                  <button
                    *ngIf="sub.status === 'Pending'"
                    class="btn btn-sm btn-primary"
                    (click)="openDetail(sub)"
                  >
                    Review
                  </button>
                  <button
                    *ngIf="sub.status === 'Pending'"
                    class="btn btn-sm"
                    style="color: var(--color-error)"
                    (click)="rejectSubmission(sub)"
                  >
                    Reject
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div *ngIf="filteredSubmissions.length === 0" class="empty-state">
        <div class="empty-icon">📝</div>
        <div class="empty-title">No submissions to show</div>
      </div>
    </div>

    <!-- Review Modal -->
    <div
      class="modal-backdrop"
      *ngIf="selectedSub"
      (click)="selectedSub = null"
    >
      <div class="modal" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>Submission Review</h3>
          <button class="btn btn-sm" (click)="selectedSub = null">✕</button>
        </div>
        <div class="modal-body">
          <div class="detail-grid">
            <div class="detail-item">
              <label>Supplier</label><span>{{ selectedSub.supplier }}</span>
            </div>
            <div class="detail-item">
              <label>Type</label
              ><span class="badge" [ngClass]="getTypeBadge(selectedSub.type)">{{
                selectedSub.type
              }}</span>
            </div>
            <div class="detail-item">
              <label>Entity</label><span>{{ selectedSub.entity }}</span>
            </div>
            <div class="detail-item">
              <label>Submitted</label><span>{{ selectedSub.submitted }}</span>
            </div>
          </div>

          <div class="form-group" style="margin-top: 16px">
            <label>Review Notes</label>
            <textarea
              class="form-control"
              [(ngModel)]="reviewNotes"
              placeholder="Add review notes..."
            ></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button
            class="btn"
            style="background: var(--color-error); color: white"
            (click)="rejectSubmission(selectedSub)"
          >
            Reject
          </button>
          <button
            class="btn btn-primary"
            (click)="approveSubmission(selectedSub)"
          >
            Approve
          </button>
        </div>
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
      .action-buttons {
        display: flex;
        gap: 6px;
      }
      .detail-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
      .detail-item {
        padding: 8px 0;
        label {
          font-size: 11px;
          font-weight: 600;
          color: var(--color-text-muted);
          display: block;
          margin-bottom: 2px;
        }
      }
    `,
  ],
})
export class SupplierSubmissionsComponent {
  tab = "pending";
  selectedSub: any = null;
  reviewNotes = "";
  toast: any = null;

  submissions = [
    {
      id: 1,
      supplier: "Mumbai Fresh Foods",
      type: "New Vendor",
      entity: "Accor — North India",
      submitted: "Jul 2, 2025",
      status: "Pending",
    },
    {
      id: 2,
      supplier: "Green Valley Farms",
      type: "Catalogue Update",
      entity: "Accor — North India",
      submitted: "Jul 4, 2025",
      status: "Pending",
    },
    {
      id: 3,
      supplier: "Delhi Spice Traders",
      type: "KYC Update",
      entity: "Taj Hotels — West",
      submitted: "Jul 5, 2025",
      status: "Pending",
    },
    {
      id: 4,
      supplier: "Apex Chemical Supplies",
      type: "New Vendor",
      entity: "Taj Hotels — West",
      submitted: "Jun 28, 2025",
      status: "Approved",
    },
    {
      id: 5,
      supplier: "Coastal Seafood Exports",
      type: "Catalogue Update",
      entity: "Accor — North India",
      submitted: "Jun 25, 2025",
      status: "Rejected",
    },
  ];

  get filteredSubmissions() {
    if (this.tab === "all") return this.submissions;
    return this.submissions.filter((s) => s.status.toLowerCase() === this.tab);
  }

  getTypeBadge(type: string): string {
    const map: Record<string, string> = {
      "New Vendor": "badge-info",
      "Catalogue Update": "badge-warning",
      "KYC Update": "badge-purple",
    };
    return map[type] || "badge-muted";
  }

  getStatusBadge(status: string): string {
    const map: Record<string, string> = {
      Pending: "badge-warning",
      Approved: "badge-success",
      Rejected: "badge-error",
    };
    return map[status] || "badge-muted";
  }

  openDetail(sub: any) {
    this.selectedSub = sub;
  }

  approveSubmission(sub: any) {
    sub.status = "Approved";
    this.selectedSub = null;
    this.showToast("success", `Submission approved for ${sub.supplier}`);
  }

  rejectSubmission(sub: any) {
    sub.status = "Rejected";
    this.selectedSub = null;
    this.showToast("error", `Submission rejected for ${sub.supplier}`);
  }

  showToast(type: string, message: string) {
    this.toast = { type, message };
    setTimeout(() => (this.toast = null), 3000);
  }
}
