import { Component, OnInit, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { HttpErrorResponse } from "@angular/common/http";
import { GovApiService } from "../../services/gov-api.service";

@Component({
  selector: "app-kyc-change-approvals",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header">
      <h1>KYC Change Approvals</h1>
      <p class="page-subtitle">Review supplier-initiated changes to KYC data</p>
    </div>

    <div class="card">
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Supplier</th>
              <th>Change Type</th>
              <th>Field</th>
              <th>From</th>
              <th>To</th>
              <th>Submitted</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let req of requests">
              <td>
                <strong>{{ req.supplier }}</strong>
              </td>
              <td>
                <span class="badge badge-purple">{{ req.changeType }}</span>
              </td>
              <td>{{ req.field }}</td>
              <td class="old-value">{{ req.from }}</td>
              <td class="new-value">{{ req.to }}</td>
              <td>{{ req.submitted }}</td>
              <td>
                <div class="action-buttons">
                  <button class="btn btn-sm btn-primary" (click)="approve(req)">
                    Approve
                  </button>
                  <button
                    class="btn btn-sm"
                    style="color: var(--color-error)"
                    (click)="reject(req)"
                  >
                    Reject
                  </button>
                  <button
                    class="btn btn-sm btn-secondary"
                    (click)="openDetail(req)"
                  >
                    Detail
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div *ngIf="requests.length === 0" class="empty-state">
        <div class="empty-icon">✅</div>
        <div class="empty-title">No pending change requests</div>
        <div class="empty-desc">All supplier KYC changes are up to date.</div>
      </div>
    </div>

    <!-- Detail Modal -->
    <div
      class="modal-backdrop"
      *ngIf="selectedReq"
      (click)="selectedReq = null"
    >
      <div class="modal" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>KYC Change Detail</h3>
          <button class="btn btn-sm" (click)="selectedReq = null">✕</button>
        </div>
        <div class="modal-body">
          <div class="detail-grid">
            <div class="detail-item">
              <label>Supplier</label><span>{{ selectedReq.supplier }}</span>
            </div>
            <div class="detail-item">
              <label>Change Type</label
              ><span class="badge badge-purple">{{
                selectedReq.changeType
              }}</span>
            </div>
            <div class="detail-item">
              <label>Field</label><span>{{ selectedReq.field }}</span>
            </div>
            <div class="detail-item">
              <label>Current Value</label
              ><span class="old-value">{{ selectedReq.from }}</span>
            </div>
            <div class="detail-item">
              <label>Proposed Value</label
              ><span class="new-value">{{ selectedReq.to }}</span>
            </div>
          </div>
          <div class="form-group" style="margin-top: 16px">
            <label>Approval Notes (optional)</label>
            <textarea
              class="form-control"
              [(ngModel)]="notes"
              placeholder="Add a note..."
            ></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button
            class="btn"
            style="background: var(--color-error); color: white"
            (click)="reject(selectedReq)"
          >
            Reject
          </button>
          <button class="btn btn-primary" (click)="approve(selectedReq)">
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
      .action-buttons {
        display: flex;
        gap: 6px;
      }
      .old-value {
        color: var(--color-text-muted);
        text-decoration: line-through;
        font-size: 12px;
      }
      .new-value {
        color: var(--color-success);
        font-weight: 600;
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
export class KycChangeApprovalsComponent implements OnInit {
  private api = inject(GovApiService);

  selectedReq: any = null;
  notes = "";
  toast: any = null;
  requests: any[] = [];
  busy = false;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.api.getPendingChangeRequests().subscribe({
      next: (reqs) => {
        this.requests = (reqs ?? []).map((r) => ({
          id: r.id,
          supplier: r.vendorId ? "Vendor " + r.vendorId.substring(0, 8) : "—",
          changeType: r.fieldChanged,
          field: r.fieldChanged,
          from: r.oldValue ?? "—",
          to: r.newValue ?? "—",
          submitted: r.requestedAt,
        }));
      },
      error: (err: HttpErrorResponse) => {
        if (err.status === 401 || err.status === 403)
          this.showToast("error", "Authentication required — open from the host app.");
        else this.showToast("error", "Could not load change requests.");
      },
    });
  }

  approve(req: any) {
    if (this.busy) return;
    this.busy = true;
    this.api.approveChangeRequest(req.id).subscribe({
      next: () => {
        this.busy = false;
        this.requests = this.requests.filter((r) => r.id !== req.id);
        this.selectedReq = null;
        this.showToast("success", `Change request approved for ${req.supplier}`);
      },
      error: () => {
        this.busy = false;
        this.showToast("error", "Could not approve the change request.");
      },
    });
  }

  reject(req: any) {
    if (this.busy) return;
    this.busy = true;
    this.api.rejectChangeRequest(req.id).subscribe({
      next: () => {
        this.busy = false;
        this.requests = this.requests.filter((r) => r.id !== req.id);
        this.selectedReq = null;
        this.showToast("error", `Change request rejected for ${req.supplier}`);
      },
      error: () => {
        this.busy = false;
        this.showToast("error", "Could not reject the change request.");
      },
    });
  }

  openDetail(req: any) {
    this.selectedReq = req;
  }

  showToast(type: string, message: string) {
    this.toast = { type, message };
    setTimeout(() => (this.toast = null), 3000);
  }
}
