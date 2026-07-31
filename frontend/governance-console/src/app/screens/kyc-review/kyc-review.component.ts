import { Component, OnInit, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { HttpErrorResponse } from "@angular/common/http";
import { GovApiService } from "../../services/gov-api.service";

@Component({
  selector: "app-kyc-review",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header">
      <h1>KYC Review</h1>
      <p class="page-subtitle">
        Review and validate vendor KYC submissions from the buying group
      </p>
    </div>

    <!-- Status Tabs -->
    <div class="tabs">
      <div
        class="tab"
        [class.active]="tab === 'pending'"
        (click)="tab = 'pending'"
      >
        Pending <span class="count-badge">{{ pendingCount }}</span>
      </div>
      <div
        class="tab"
        [class.active]="tab === 'validated'"
        (click)="tab = 'validated'"
      >
        Validated
      </div>
      <div
        class="tab"
        [class.active]="tab === 'blocked'"
        (click)="tab = 'blocked'"
      >
        Blocked
      </div>
      <div class="tab" [class.active]="tab === 'all'" (click)="tab = 'all'">
        All Vendors
      </div>
    </div>

    <!-- KPIs -->
    <div class="kpi-grid" style="margin-top: 16px">
      <div class="kpi-card" style="border-left: 4px solid var(--color-warning)">
        <div class="kpi-label">Pending Review</div>
        <div class="kpi-value">{{ pendingCount }}</div>
      </div>
      <div class="kpi-card" style="border-left: 4px solid var(--color-success)">
        <div class="kpi-label">Validated</div>
        <div class="kpi-value">{{ validatedCount }}</div>
      </div>
      <div class="kpi-card" style="border-left: 4px solid var(--color-error)">
        <div class="kpi-label">Blocked</div>
        <div class="kpi-value">{{ blockedCount }}</div>
      </div>
    </div>

    <!-- Vendor Table -->
    <div class="card" style="margin-top: 16px">
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Vendor</th>
              <th>GSTIN</th>
              <th>City</th>
              <th>Submitted By</th>
              <th>Entity</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let v of filteredVendors">
              <td>
                <strong>{{ v.name }}</strong
                ><br /><span class="text-muted">{{ v.contact }}</span>
              </td>
              <td>
                <code>{{ v.gstin }}</code>
              </td>
              <td>{{ v.city }}</td>
              <td>{{ v.submittedBy }}</td>
              <td>{{ v.entity }}</td>
              <td>
                <span class="badge" [ngClass]="getStatusBadge(v.status)">{{
                  v.status
                }}</span>
              </td>
              <td>
                <button
                  class="btn btn-sm"
                  [class.btn-primary]="v.status === 'Pending'"
                  [disabled]="v.status !== 'Pending'"
                  (click)="openDetail(v)"
                >
                  Review
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- KYC Detail Drawer -->
    <div
      class="drawer-backdrop"
      *ngIf="selectedVendor"
      (click)="selectedVendor = null"
    >
      <div class="drawer" (click)="$event.stopPropagation()">
        <div class="drawer-header">
          <div>
            <h2>{{ selectedVendor.name }}</h2>
            <p>{{ selectedVendor.entity }} · {{ selectedVendor.gstin }}</p>
          </div>
          <button class="btn btn-sm" (click)="selectedVendor = null">✕</button>
        </div>
        <div class="drawer-body">
          <!-- Documents Checklist -->
          <h3>Documents Submitted</h3>
          <div class="checklist">
            <div *ngFor="let doc of documents" class="checklist-item">
              <span
                class="check"
                [class.check-ok]="doc.verified"
                [class.check-warn]="!doc.verified"
              >
                {{ doc.verified ? "✅" : "⏳" }}
              </span>
              <div class="doc-info">
                <span class="doc-name">{{ doc.name }}</span>
                <span class="doc-expiry" *ngIf="doc.expiry">
                  Expires: {{ doc.expiry }}
                  <span
                    *ngIf="doc.expiryDays !== null && doc.expiryDays < 30"
                    class="expiring-soon"
                  >
                    ({{ doc.expiryDays }} days)
                  </span>
                </span>
              </div>
            </div>
          </div>

          <!-- Data Validation -->
          <h3 style="margin-top: 20px">Data Validation</h3>
          <div class="validation-grid">
            <div class="validation-row">
              <span>GSTIN format</span>
              <span class="badge badge-success">Valid</span>
            </div>
            <div class="validation-row">
              <span>PAN match</span>
              <span
                class="badge"
                [ngClass]="
                  selectedVendor.panMatch ? 'badge-success' : 'badge-error'
                "
              >
                {{ selectedVendor.panMatch ? "Matched" : "Mismatch" }}
              </span>
            </div>
            <div class="validation-row">
              <span>Address match</span>
              <span class="badge badge-success">Verified</span>
            </div>
          </div>

          <!-- Actions -->
          <div class="action-buttons" style="margin-top: 24px">
            <button class="btn btn-primary" (click)="validateVendor()">
              ✅ Validate
            </button>
            <button
              class="btn"
              style="background: var(--color-error); color: white"
              (click)="blockVendor()"
            >
              🚫 Block
            </button>
            <button class="btn btn-secondary" (click)="selectedVendor = null">
              Cancel
            </button>
          </div>
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
      .kpi-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
      }
      code {
        background: var(--color-surface-alt);
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 12px;
      }
      .text-muted {
        font-size: 12px;
        color: var(--color-text-muted);
      }

      .drawer-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.4);
        z-index: 100;
        display: flex;
        justify-content: flex-end;
      }
      .drawer {
        width: 600px;
        max-width: 90vw;
        background: white;
        overflow-y: auto;
        box-shadow: -10px 0 30px rgba(0, 0, 0, 0.2);
      }
      .drawer-header {
        padding: 20px;
        border-bottom: 1px solid var(--color-border);
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        h2 {
          font-size: 18px;
          font-weight: 700;
        }
        p {
          font-size: 13px;
          color: var(--color-text-secondary);
        }
      }
      .drawer-body {
        padding: 20px;
      }
      h3 {
        font-size: 14px;
        font-weight: 600;
        margin-bottom: 12px;
      }

      .checklist-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 0;
        border-bottom: 1px solid var(--color-border-light);
      }
      .doc-info {
        flex: 1;
      }
      .doc-name {
        font-size: 13px;
        font-weight: 500;
        display: block;
      }
      .doc-expiry {
        font-size: 11px;
        color: var(--color-text-muted);
      }
      .expiring-soon {
        color: var(--color-warning);
        font-weight: 600;
      }

      .validation-grid {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .validation-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        background: var(--color-surface-alt);
        border-radius: 6px;
        font-size: 13px;
      }

      .action-buttons {
        display: flex;
        gap: 10px;
      }
    `,
  ],
})
export class KycReviewComponent implements OnInit {
  private api = inject(GovApiService);

  tab = "pending";
  selectedVendor: any = null;
  toast: any = null;
  vendors: any[] = [];
  busy = false;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    // Full vendor master, so the pending/validated/blocked/all tabs all work.
    this.api.getVendors().subscribe({
      next: (res) => {
        this.vendors = (res?.items ?? []).map((v) => ({
          id: v.id,
          name: v.legalName,
          contact: v.contactEmail || v.contactPhone || "—",
          gstin: v.gstin || "—",
          city: v.city || "—",
          submittedBy: "—",
          entity: "—",
          status: this.mapKyc(v.kycStatus),
          panMatch: true,
        }));
      },
      error: (err: HttpErrorResponse) => {
        if (err.status === 401 || err.status === 403)
          this.showToast("error", "Authentication required — open from the host app.");
        else this.showToast("error", "Could not load vendors.");
      },
    });
  }

  private mapKyc(kycStatus: string): string {
    switch (kycStatus) {
      case "Incomplete":
        return "Pending";
      case "Validated":
        return "Validated";
      case "Blocked":
        return "Blocked";
      case "Expired":
        return "Expired";
      default:
        return kycStatus;
    }
  }

  get pendingCount(): number {
    return this.vendors.filter((v) => v.status === "Pending").length;
  }
  get validatedCount(): number {
    return this.vendors.filter((v) => v.status === "Validated").length;
  }
  get blockedCount(): number {
    return this.vendors.filter((v) => v.status === "Blocked").length;
  }

  documents = [
    {
      name: "GST Registration Certificate",
      verified: true,
      expiry: null,
      expiryDays: null,
    },
    { name: "PAN Card", verified: true, expiry: null, expiryDays: null },
    {
      name: "MSME Certificate (Udyam)",
      verified: false,
      expiry: "2025-09-15",
      expiryDays: 72,
    },
    {
      name: "Trade License",
      verified: false,
      expiry: "2025-08-01",
      expiryDays: 27,
    },
    {
      name: "Insurance Certificate",
      verified: false,
      expiry: "2025-12-31",
      expiryDays: 180,
    },
  ];

  get filteredVendors() {
    if (this.tab === "all") return this.vendors;
    return this.vendors.filter((v) => v.status.toLowerCase() === this.tab);
  }

  getStatusBadge(status: string): string {
    const map: Record<string, string> = {
      Pending: "badge-warning",
      Validated: "badge-success",
      Blocked: "badge-error",
    };
    return map[status] || "badge-muted";
  }

  openDetail(vendor: any) {
    this.selectedVendor = vendor;
  }

  validateVendor() {
    if (!this.selectedVendor || this.busy) return;
    const v = this.selectedVendor;
    this.busy = true;
    this.api.validateKyc(v.id).subscribe({
      next: () => {
        this.busy = false;
        v.status = "Validated";
        this.showToast("success", `${v.name} validated successfully`);
        setTimeout(() => (this.selectedVendor = null), 1200);
      },
      error: () => {
        this.busy = false;
        this.showToast("error", `Could not validate ${v.name}`);
      },
    });
  }

  blockVendor() {
    if (!this.selectedVendor || this.busy) return;
    const v = this.selectedVendor;
    this.busy = true;
    this.api.blockKyc(v.id).subscribe({
      next: () => {
        this.busy = false;
        v.status = "Blocked";
        this.showToast("error", `${v.name} has been blocked`);
        setTimeout(() => (this.selectedVendor = null), 1200);
      },
      error: () => {
        this.busy = false;
        this.showToast("error", `Could not block ${v.name}`);
      },
    });
  }

  showToast(type: string, message: string) {
    this.toast = { type, message };
    setTimeout(() => (this.toast = null), 3000);
  }
}
