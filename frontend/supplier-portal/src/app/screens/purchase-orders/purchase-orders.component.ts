import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router, RouterModule } from "@angular/router";

@Component({
  selector: "app-purchase-orders",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="page-header">
      <h1>Purchase Orders</h1>
      <p class="page-subtitle">
        View and respond to purchase orders from your buying entities
      </p>
    </div>

    <!-- Status Filter Chips -->
    <div class="filter-bar">
      <div class="filter-chips">
        <button
          *ngFor="let f of filters"
          class="chip"
          [class.active]="statusFilter === f.value"
          (click)="statusFilter = f.value"
        >
          {{ f.label }}
        </button>
      </div>
      <input
        type="text"
        class="form-control search-input"
        placeholder="Search POs..."
        [(ngModel)]="searchTerm"
      />
    </div>

    <!-- PO Table -->
    <div class="card">
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>PO Number</th>
              <th>Buying Entity</th>
              <th>Order Date</th>
              <th>Required By</th>
              <th>Lines</th>
              <th>Value</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr
              *ngFor="let po of filteredPOs"
              (click)="openDetail(po)"
              class="clickable"
            >
              <td>
                <code>{{ po.poNumber }}</code>
              </td>
              <td>{{ po.entity }}</td>
              <td>{{ po.orderDate }}</td>
              <td>{{ po.requiredBy }}</td>
              <td>{{ po.lines }}</td>
              <td>₹{{ po.value | number }}</td>
              <td>
                <span class="badge" [ngClass]="getStatusBadge(po.status)">{{
                  po.status
                }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div *ngIf="filteredPOs.length === 0" class="empty-state">
        <div class="empty-icon">📋</div>
        <div class="empty-title">No purchase orders found</div>
      </div>
    </div>

    <!-- Detail Drawer -->
    <div class="drawer-backdrop" *ngIf="selectedPO" (click)="selectedPO = null">
      <div class="drawer" (click)="$event.stopPropagation()">
        <div class="drawer-header">
          <div>
            <h2>{{ selectedPO.poNumber }}</h2>
            <p>{{ selectedPO.entity }} · {{ selectedPO.property }}</p>
          </div>
          <span class="badge" [ngClass]="getStatusBadge(selectedPO.status)">{{
            selectedPO.status
          }}</span>
          <button class="btn btn-sm" (click)="selectedPO = null">✕</button>
        </div>

        <div class="drawer-body">
          <div class="po-meta">
            <div><strong>Order Date:</strong> {{ selectedPO.orderDate }}</div>
            <div><strong>Required By:</strong> {{ selectedPO.requiredBy }}</div>
            <div>
              <strong>Total Value:</strong> ₹{{ selectedPO.value | number }}
            </div>
          </div>

          <h3>Line Items</h3>
          <table class="data-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>UOM</th>
                <th>Unit Price</th>
                <th>Line Total</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let line of selectedPO.lineItems">
                <td>{{ line.item }}</td>
                <td>{{ line.qty }}</td>
                <td>{{ line.uom }}</td>
                <td>₹{{ line.unitPrice | number: "1.2-2" }}</td>
                <td>₹{{ line.lineTotal | number: "1.2-2" }}</td>
              </tr>
            </tbody>
          </table>

          <!-- Actions -->
          <div *ngIf="selectedPO.status === 'New'" class="action-zone">
            <h3>Actions</h3>
            <div class="action-buttons">
              <button class="btn btn-primary" (click)="acknowledgePo()">
                Acknowledge in Full
              </button>
              <button
                class="btn btn-secondary"
                (click)="showPartialDialog = true"
              >
                Partially Accept
              </button>
              <button
                class="btn"
                style="color: var(--color-error)"
                (click)="showUnableDialog = true"
              >
                Unable to Supply
              </button>
            </div>
          </div>

          <div *ngIf="selectedPO.status === 'Acknowledged'" class="action-zone">
            <button
              class="btn btn-primary"
              routerLink="/purchase-orders/{{ selectedPO.id }}/delivery-note"
            >
              Raise Delivery Note
            </button>
          </div>

          <!-- Partial Accept Dialog -->
          <div *ngIf="showPartialDialog" class="inline-dialog">
            <h4>Partial Acceptance</h4>
            <div
              *ngFor="let line of selectedPO.lineItems; let i = index"
              class="partial-row"
            >
              <span>{{ line.item }}</span>
              <span>Ordered: {{ line.qty }}</span>
              <input
                type="number"
                class="form-control inline-input"
                [(ngModel)]="acceptedQtys[i]"
                [max]="line.qty"
              />
              <input
                class="form-control inline-input"
                placeholder="Reason (if short)"
                [(ngModel)]="acceptReasons[i]"
              />
            </div>
            <div class="action-buttons">
              <button class="btn btn-primary" (click)="confirmPartial()">
                Confirm
              </button>
              <button
                class="btn btn-secondary"
                (click)="showPartialDialog = false"
              >
                Cancel
              </button>
            </div>
          </div>

          <!-- Unable to Supply Dialog -->
          <div *ngIf="showUnableDialog" class="inline-dialog">
            <h4>Unable to Supply</h4>
            <div class="form-group">
              <label>Reason</label>
              <textarea
                class="form-control"
                [(ngModel)]="unableReason"
                placeholder="Please provide a reason..."
              ></textarea>
            </div>
            <div class="action-buttons">
              <button
                class="btn"
                style="background: var(--color-error); color: white"
                (click)="confirmUnable()"
              >
                Confirm
              </button>
              <button
                class="btn btn-secondary"
                (click)="showUnableDialog = false"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>

        <!-- Toast -->
        <div *ngIf="toast" class="toast" [ngClass]="'toast-' + toast.type">
          {{ toast.message }}
        </div>
      </div>
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
      .filter-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }
      .filter-chips {
        display: flex;
        gap: 6px;
      }
      .chip {
        padding: 6px 14px;
        font-size: 12px;
        font-weight: 500;
        border: 1px solid var(--color-border);
        border-radius: 99px;
        background: white;
        cursor: pointer;
        transition: all 0.15s;
        &:hover {
          border-color: var(--color-primary);
        }
        &.active {
          background: var(--color-primary);
          color: white;
          border-color: var(--color-primary);
        }
      }
      .search-input {
        width: 240px;
      }
      .table-wrap {
        overflow-x: auto;
      }
      .clickable {
        cursor: pointer;
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

      .drawer-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.4);
        z-index: 100;
        display: flex;
        justify-content: flex-end;
      }
      .drawer {
        width: 700px;
        max-width: 90vw;
        background: white;
        overflow-y: auto;
        box-shadow: -10px 0 30px rgba(0, 0, 0, 0.2);
        position: relative;
      }
      .drawer-header {
        padding: 20px;
        border-bottom: 1px solid var(--color-border);
        display: flex;
        align-items: flex-start;
        gap: 12px;
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
      .po-meta {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
        margin-bottom: 24px;
        font-size: 13px;
      }
      h3 {
        font-size: 14px;
        font-weight: 600;
        margin-bottom: 12px;
      }
      .action-zone {
        margin-top: 24px;
        padding-top: 20px;
        border-top: 1px solid var(--color-border);
      }
      .action-buttons {
        display: flex;
        gap: 10px;
        margin-top: 12px;
      }

      .inline-dialog {
        margin-top: 16px;
        padding: 16px;
        background: var(--color-surface-alt);
        border-radius: 8px;
      }
      .partial-row {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 8px;
        font-size: 13px;
      }
      .inline-input {
        width: 120px;
        padding: 6px 8px;
        font-size: 12px;
      }

      @media (max-width: 768px) {
        .filter-bar {
          flex-direction: column;
          align-items: stretch;
          gap: 10px;
        }
        .filter-chips {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          flex-wrap: nowrap;
          padding-bottom: 4px;
        }
        .filter-chips::-webkit-scrollbar {
          display: none;
        }
        .search-input {
          width: 100% !important;
        }
        .drawer {
          width: 100% !important;
          max-width: 100vw !important;
        }
        .po-meta {
          grid-template-columns: 1fr !important;
          gap: 8px;
        }
        .action-buttons {
          flex-wrap: wrap;
        }
        .partial-row {
          flex-wrap: wrap;
          gap: 8px;
        }
        .partial-row span {
          flex: 1 1 40%;
        }
        .inline-input {
          width: 100%;
        }
      }
    `,
  ],
})
export class PurchaseOrdersComponent {
  searchTerm = "";
  statusFilter = "";
  selectedPO: any = null;
  showPartialDialog = false;
  showUnableDialog = false;
  acceptedQtys: number[] = [];
  acceptReasons: string[] = [];
  unableReason = "";
  toast: any = null;

  filters = [
    { label: "All", value: "" },
    { label: "New", value: "New" },
    { label: "Acknowledged", value: "Acknowledged" },
    { label: "Delivered", value: "Delivered" },
  ];

  pos = [
    {
      id: "1",
      poNumber: "PO-20250701-001",
      entity: "Accor — North India",
      property: "Sofitel Delhi",
      orderDate: "Jul 1, 2025",
      requiredBy: "Jul 15, 2025",
      lines: 1,
      value: 84000,
      status: "New",
      lineItems: [
        {
          item: "Basmati Rice 25kg",
          qty: 30,
          uom: "Kg",
          unitPrice: 2800,
          lineTotal: 84000,
        },
      ],
    },
    {
      id: "2",
      poNumber: "PO-20250702-002",
      entity: "Accor — North India",
      property: "Novotel Mumbai",
      orderDate: "Jul 2, 2025",
      requiredBy: "Jul 18, 2025",
      lines: 1,
      value: 49500,
      status: "Acknowledged",
      lineItems: [
        {
          item: "Sunflower Oil 15L",
          qty: 30,
          uom: "Litre",
          unitPrice: 1650,
          lineTotal: 49500,
        },
      ],
    },
    {
      id: "3",
      poNumber: "PO-20250703-003",
      entity: "Accor — North India",
      property: "Sofitel Delhi",
      orderDate: "Jul 3, 2025",
      requiredBy: "Jul 20, 2025",
      lines: 1,
      value: 28000,
      status: "New",
      lineItems: [
        {
          item: "Floor Cleaner 5L",
          qty: 80,
          uom: "Litre",
          unitPrice: 350,
          lineTotal: 28000,
        },
      ],
    },
    {
      id: "4",
      poNumber: "PO-20250704-004",
      entity: "Taj Hotels — West",
      property: "Taj Palace Mumbai",
      orderDate: "Jul 4, 2025",
      requiredBy: "Jul 22, 2025",
      lines: 1,
      value: 126000,
      status: "Delivered",
      lineItems: [
        {
          item: "Tomato Ketchup 1kg",
          qty: 700,
          uom: "Kg",
          unitPrice: 180,
          lineTotal: 126000,
        },
      ],
    },
  ];

  get filteredPOs() {
    return this.pos.filter(
      (po) =>
        (!this.statusFilter || po.status === this.statusFilter) &&
        (!this.searchTerm ||
          po.poNumber.toLowerCase().includes(this.searchTerm.toLowerCase())),
    );
  }

  getStatusBadge(status: string): string {
    const map: Record<string, string> = {
      New: "badge-info",
      Acknowledged: "badge-success",
      Delivered: "badge-muted",
      "Partially accepted": "badge-warning",
      "Unable to supply": "badge-error",
    };
    return map[status] || "badge-muted";
  }

  openDetail(po: any) {
    this.selectedPO = po;
    this.acceptedQtys = po.lineItems.map((l: any) => l.qty);
    this.acceptReasons = po.lineItems.map(() => "");
  }

  acknowledgePo() {
    this.selectedPO.status = "Acknowledged";
    this.showToast("success", "PO acknowledged successfully");
    setTimeout(() => (this.selectedPO = null), 1500);
  }

  confirmPartial() {
    this.selectedPO.status = "Partially accepted";
    this.showPartialDialog = false;
    this.showToast("success", "Partial acceptance confirmed");
  }

  confirmUnable() {
    this.selectedPO.status = "Unable to supply";
    this.showUnableDialog = false;
    this.showToast("success", "Unable to supply recorded");
  }

  showToast(type: string, message: string) {
    this.toast = { type, message };
    setTimeout(() => (this.toast = null), 3000);
  }
}
