import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";

@Component({
  selector: "app-item-dedup",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-header">
      <h1>Item Deduplication</h1>
      <p class="page-subtitle">
        Manage duplicate item suggestions from AI/ML pipeline · Model v2.3
      </p>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Open Suggestions</div>
        <div class="kpi-value">2</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Resolved This Month</div>
        <div class="kpi-value">15</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Last Model Run</div>
        <div class="kpi-value" style="font-size: 16px">
          Jul 7, 2025 03:00 UTC
        </div>
      </div>
    </div>

    <div
      *ngFor="let cluster of clusters"
      class="cluster-card card"
      style="margin-top: 16px"
    >
      <div class="card-header">
        {{ cluster.itemName }} — Similarity: {{ cluster.similarity }}%
        <span class="badge badge-info" style="margin-left: 8px">{{
          cluster.status
        }}</span>
      </div>
      <div class="card-body">
        <div class="item-comparison">
          <div *ngFor="let item of cluster.items" class="item-row">
            <span class="item-code">{{ item.itemCode }}</span>
            <span class="item-desc">{{ item.description }}</span>
            <span class="item-price">₹{{ item.price | number: "1.2-2" }}</span>
            <span class="item-vendor">{{ item.vendor }}</span>
            <span *ngIf="item.isPrimary" class="badge badge-success"
              >Master</span
            >
          </div>
        </div>
        <div class="cluster-actions">
          <button class="btn btn-primary" (click)="merge(cluster)">
            🔗 Merge
          </button>
          <button class="btn btn-secondary" (click)="dismiss(cluster)">
            Dismiss
          </button>
        </div>
      </div>
    </div>

    <div *ngIf="clusters.length === 0" class="card" style="margin-top: 16px">
      <div class="empty-state">
        <div class="empty-icon">📦</div>
        <div class="empty-title">No open suggestions</div>
        <div class="empty-desc">
          All item deduplication suggestions have been reviewed.
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
      .kpi-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
      }
      .item-comparison {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .item-row {
        display: grid;
        grid-template-columns: 120px 1fr 100px 140px 80px;
        align-items: center;
        gap: 12px;
        padding: 10px 12px;
        border: 1px solid var(--color-border-light);
        border-radius: 6px;
        font-size: 13px;
      }
      .item-code {
        font-family: monospace;
        font-size: 12px;
        background: var(--color-surface-alt);
        padding: 2px 6px;
        border-radius: 3px;
      }
      .item-price {
        font-weight: 600;
      }
      .item-vendor {
        font-size: 12px;
        color: var(--color-text-secondary);
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
export class ItemDedupComponent {
  toast: any = null;

  clusters = [
    {
      itemName: "Basmati Rice 25kg",
      similarity: 95,
      status: "Open",
      items: [
        {
          itemCode: "FOOD-001",
          description: "Basmati Rice 25kg",
          price: 2968,
          vendor: "Mumbai Fresh Foods",
          isPrimary: true,
        },
        {
          itemCode: "FOOD-102",
          description: "Premium Basmati Rice 25kg Bag",
          price: 2890,
          vendor: "Delhi Spice Traders",
          isPrimary: false,
        },
      ],
    },
    {
      itemName: "Sunflower Oil 15L",
      similarity: 88,
      status: "Open",
      items: [
        {
          itemCode: "FOOD-002",
          description: "Sunflower Oil 15L",
          price: 1650,
          vendor: "Green Valley Farms",
          isPrimary: true,
        },
        {
          itemCode: "FOOD-205",
          description: "Sunflower Refined Oil 15L Tin",
          price: 1680,
          vendor: "Coastal Seafood Exports",
          isPrimary: false,
        },
      ],
    },
  ];

  merge(cluster: any) {
    this.clusters = this.clusters.filter((c) => c !== cluster);
    this.showToast("success", `"${cluster.itemName}" merged successfully`);
  }

  dismiss(cluster: any) {
    this.clusters = this.clusters.filter((c) => c !== cluster);
    this.showToast("success", `Suggestion for "${cluster.itemName}" dismissed`);
  }

  showToast(type: string, message: string) {
    this.toast = { type, message };
    setTimeout(() => (this.toast = null), 3000);
  }
}
