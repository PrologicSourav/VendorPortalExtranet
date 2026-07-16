import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

@Component({
  selector: "app-catalogue-approvals",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header">
      <h1>Catalogue Approvals</h1>
      <p class="page-subtitle">
        Review and approve supplier catalogue submissions for buying group
      </p>
    </div>

    <div class="tabs">
      <div
        class="tab"
        [class.active]="tab === 'pending'"
        (click)="tab = 'pending'"
      >
        Pending <span class="count-badge">2</span>
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

    <div
      *ngFor="let cat of filteredCatalogues"
      class="card"
      style="margin-top: 16px"
    >
      <div class="card-header">
        {{ cat.supplier }} — {{ cat.lines }} items
        <span
          class="badge"
          [ngClass]="getStatusBadge(cat.status)"
          style="margin-left: 8px"
          >{{ cat.status }}</span
        >
        <span class="badge badge-muted" style="margin-left: 4px"
          >v{{ cat.version }}</span
        >
      </div>
      <div class="card-body">
        <div class="catalogue-meta">
          <span>Submitted: {{ cat.submitted }}</span>
          <span>Entity: {{ cat.entity }}</span>
        </div>

        <table class="data-table" style="margin-top: 12px">
          <thead>
            <tr>
              <th>Item Code</th>
              <th>Description</th>
              <th>Price</th>
              <th>Contract Price</th>
              <th>Deviation</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let line of cat.lineItems">
              <td>
                <code>{{ line.code }}</code>
              </td>
              <td>{{ line.description }}</td>
              <td>₹{{ line.price | number: "1.2-2" }}</td>
              <td>₹{{ line.contractPrice | number: "1.2-2" }}</td>
              <td>
                <span
                  [class.deviation-high]="line.deviation > 5"
                  [class.deviation-ok]="line.deviation <= 5"
                >
                  {{ line.deviation > 0 ? "+" : "" }}{{ line.deviation }}%
                </span>
              </td>
              <td>
                <span
                  class="badge"
                  [ngClass]="
                    line.status === 'On contract'
                      ? 'badge-success'
                      : 'badge-warning'
                  "
                >
                  {{ line.status }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>

        <div *ngIf="cat.status === 'Pending'" class="catalogue-actions">
          <button class="btn btn-primary" (click)="approve(cat)">
            ✅ Approve All
          </button>
          <button class="btn btn-secondary" (click)="reject(cat)">
            ❌ Reject
          </button>
        </div>
      </div>
    </div>

    <div
      *ngIf="filteredCatalogues.length === 0"
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
export class CatalogueApprovalsComponent {
  tab = "pending";
  toast: any = null;

  catalogues = [
    {
      id: 1,
      supplier: "Mumbai Fresh Foods",
      lines: 3,
      version: "3",
      entity: "Accor — North India",
      submitted: "Jul 6, 2025",
      status: "Pending",
      lineItems: [
        {
          code: "FOOD-001",
          description: "Basmati Rice 25kg",
          price: 2968,
          contractPrice: 2800,
          deviation: 6,
          status: "Above contract",
        },
        {
          code: "FOOD-002",
          description: "Sunflower Oil 15L",
          price: 1650,
          contractPrice: 1650,
          deviation: 0,
          status: "On contract",
        },
        {
          code: "FOOD-003",
          description: "Tomato Ketchup 1kg",
          price: 195,
          contractPrice: 180,
          deviation: 8.33,
          status: "Above contract",
        },
      ],
    },
    {
      id: 2,
      supplier: "Green Valley Farms",
      lines: 2,
      version: "2",
      entity: "Accor — North India",
      submitted: "Jul 5, 2025",
      status: "Pending",
      lineItems: [
        {
          code: "FOOD-004",
          description: "Fresh Paneer 1kg",
          price: 420,
          contractPrice: 420,
          deviation: 0,
          status: "On contract",
        },
        {
          code: "FOOD-005",
          description: "Amul Butter 500g",
          price: 280,
          contractPrice: 275,
          deviation: 1.82,
          status: "On contract",
        },
      ],
    },
  ];

  get filteredCatalogues() {
    if (this.tab === "all") return this.catalogues;
    return this.catalogues.filter((c) => c.status.toLowerCase() === this.tab);
  }

  getStatusBadge(status: string): string {
    const map: Record<string, string> = {
      Pending: "badge-warning",
      Approved: "badge-success",
      Rejected: "badge-error",
    };
    return map[status] || "badge-muted";
  }

  approve(cat: any) {
    cat.status = "Approved";
    this.showToast("success", `${cat.supplier} catalogue approved`);
  }

  reject(cat: any) {
    cat.status = "Rejected";
    this.showToast("error", `${cat.supplier} catalogue rejected`);
  }

  showToast(type: string, message: string) {
    this.toast = { type, message };
    setTimeout(() => (this.toast = null), 3000);
  }
}
