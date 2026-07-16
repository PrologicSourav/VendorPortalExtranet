import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

@Component({
  selector: "app-vendor-dedup",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header">
      <h1>Vendor Deduplication</h1>
      <p class="page-subtitle">
        Review clusters of potential duplicate vendors across entities
      </p>
    </div>

    <div class="tabs">
      <div
        class="tab"
        [class.active]="tab === 'clusters'"
        (click)="tab = 'clusters'"
      >
        Open Clusters <span class="count-badge">3</span>
      </div>
      <div
        class="tab"
        [class.active]="tab === 'resolved'"
        (click)="tab = 'resolved'"
      >
        Resolved
      </div>
      <div
        class="tab"
        [class.active]="tab === 'dismissed'"
        (click)="tab = 'dismissed'"
      >
        Dismissed
      </div>
    </div>

    <div
      *ngFor="let cluster of clusters"
      class="cluster-card card"
      style="margin-top: 16px"
    >
      <div class="card-header">
        Cluster {{ cluster.id }} — Similarity: {{ cluster.similarity }}%
        <span class="badge badge-warning" style="margin-left: 8px">{{
          cluster.status
        }}</span>
      </div>
      <div class="card-body">
        <div class="vendor-comparison">
          <div
            *ngFor="let v of cluster.vendors"
            class="vendor-card"
            [class.primary]="v.isPrimary"
          >
            <div class="vendor-header">
              <strong>{{ v.name }}</strong>
              <span *ngIf="v.isPrimary" class="badge badge-success"
                >Primary</span
              >
            </div>
            <div class="vendor-detail">
              GSTIN: <code>{{ v.gstin }}</code>
            </div>
            <div class="vendor-detail">Entity: {{ v.entity }}</div>
            <div class="vendor-detail">City: {{ v.city }}</div>
            <div class="vendor-detail">Contact: {{ v.contact }}</div>
          </div>
        </div>
        <div class="cluster-actions">
          <button class="btn btn-primary" (click)="merge(cluster)">
            🔗 Merge into Primary
          </button>
          <button class="btn btn-secondary" (click)="dismiss(cluster)">
            Dismiss
          </button>
        </div>
      </div>
    </div>

    <div *ngIf="clusters.length === 0" class="card" style="margin-top: 16px">
      <div class="empty-state">
        <div class="empty-icon">🏢</div>
        <div class="empty-title">No open clusters</div>
        <div class="empty-desc">
          All vendor deduplication clusters have been reviewed.
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

      .vendor-comparison {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }
      .vendor-card {
        padding: 16px;
        border: 1px solid var(--color-border);
        border-radius: 8px;
        transition: all 0.15s;
        &.primary {
          border-color: var(--color-primary);
          background: #f0f4ff;
        }
      }
      .vendor-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
        font-size: 14px;
      }
      .vendor-detail {
        font-size: 12px;
        color: var(--color-text-secondary);
        padding: 2px 0;
      }
      code {
        background: var(--color-surface-alt);
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 11px;
      }

      .cluster-actions {
        display: flex;
        gap: 10px;
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid var(--color-border-light);
      }
    `,
  ],
})
export class VendorDedupComponent {
  tab = "clusters";
  toast: any = null;

  clusters = [
    {
      id: "VND-001",
      similarity: 92,
      status: "Open",
      vendors: [
        {
          name: "Mumbai Fresh Foods",
          gstin: "27AAACM1234A1Z5",
          entity: "Accor — North India",
          city: "Mumbai",
          contact: "Rajesh Kumar",
          isPrimary: true,
        },
        {
          name: "Mumbai Fresh Foods Pvt Ltd",
          gstin: "27AAACM1234A1Z9",
          entity: "Taj Hotels — West",
          city: "Mumbai",
          contact: "Rajesh Kumar",
          isPrimary: false,
        },
      ],
    },
    {
      id: "VND-002",
      similarity: 87,
      status: "Open",
      vendors: [
        {
          name: "Green Valley Farms",
          gstin: "29AABCG5678B1Z3",
          entity: "Accor — North India",
          city: "Bangalore",
          contact: "Priya Nair",
          isPrimary: true,
        },
        {
          name: "Green Valley Agri Products",
          gstin: "29AABCG5678B1Z8",
          entity: "Accor — North India",
          city: "Bangalore",
          contact: "Priya Nair",
          isPrimary: false,
        },
      ],
    },
    {
      id: "VND-003",
      similarity: 78,
      status: "Open",
      vendors: [
        {
          name: "Delhi Spice Traders",
          gstin: "07AADCD9012C1Z1",
          entity: "Taj Hotels — West",
          city: "Delhi",
          contact: "Amit Sharma",
          isPrimary: true,
        },
        {
          name: "DS Traders Delhi",
          gstin: "07AADCD9012C1Z5",
          entity: "Accor — North India",
          city: "Delhi",
          contact: "Amit S.",
          isPrimary: false,
        },
      ],
    },
  ];

  merge(cluster: any) {
    this.clusters = this.clusters.filter((c) => c !== cluster);
    this.showToast("success", `Cluster ${cluster.id} merged successfully`);
  }

  dismiss(cluster: any) {
    this.clusters = this.clusters.filter((c) => c !== cluster);
    this.showToast("success", `Cluster ${cluster.id} dismissed`);
  }

  showToast(type: string, message: string) {
    this.toast = { type, message };
    setTimeout(() => (this.toast = null), 3000);
  }
}
