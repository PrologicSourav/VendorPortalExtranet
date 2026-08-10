import { Component, effect, inject, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router, RouterModule } from "@angular/router";
import { TranslatePipe } from "@ngx-translate/core";
import { MoneyPipe } from "../../pipes/money.pipe";
import { ApiService } from "../../services/api.service";
import { AuthService } from "../../services/auth.service";
import { PropertyContextService } from "../../services/property-context.service";

@Component({
  selector: "app-purchase-orders",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslatePipe, MoneyPipe],
  template: `
    <div class="page-header">
      <h1>{{ "purchaseOrders.title" | translate }}</h1>
      <p class="page-subtitle">
        {{ "purchaseOrders.subtitle" | translate }}
      </p>
    </div>

    <!-- No vendor / loading / error notices -->
    <div *ngIf="!hasVendor" class="card notice">
      {{ "purchaseOrders.noVendorNotice" | translate }}
    </div>
    <div *ngIf="hasVendor && loading" class="card notice">
      {{ "purchaseOrders.loading" | translate }}
    </div>
    <div *ngIf="hasVendor && loadError" class="card notice error">
      {{ loadError }}
      <button class="btn btn-sm" (click)="load()">
        {{ "purchaseOrders.retry" | translate }}
      </button>
    </div>

    <!-- Status Filter Chips -->
    <div class="filter-bar" *ngIf="hasVendor && !loading && !loadError">
      <div class="filter-chips">
        <button
          *ngFor="let f of filters"
          class="chip"
          [class.active]="statusFilter === f.value"
          (click)="statusFilter = f.value"
        >
          {{ f.label | translate }}
        </button>
      </div>
      <input
        type="text"
        class="form-control search-input"
        [placeholder]="'purchaseOrders.searchPlaceholder' | translate"
        [(ngModel)]="searchTerm"
      />
    </div>

    <!-- PO Table -->
    <div class="card" *ngIf="hasVendor && !loading && !loadError">
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>{{ "purchaseOrders.poNumber" | translate }}</th>
              <th>{{ "purchaseOrders.topItems" | translate }}</th>
              <th>{{ "purchaseOrders.buyingEntity" | translate }}</th>
              <th>{{ "purchaseOrders.orderDate" | translate }}</th>
              <th>{{ "purchaseOrders.requiredBy" | translate }}</th>
              <th>{{ "purchaseOrders.lines" | translate }}</th>
              <th>{{ "purchaseOrders.value" | translate }}</th>
              <th>{{ "purchaseOrders.status" | translate }}</th>
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
              <td class="top-items" [title]="po.topItemsSummary">
                <span *ngIf="po.topItems.length; else noItems">
                  {{ po.topItemsSummary }}
                  <span *ngIf="po.lines > po.topItems.length" class="more-count">
                    {{ "purchaseOrders.topItemsMore" | translate: { count: po.lines - po.topItems.length } }}
                  </span>
                </span>
                <ng-template #noItems>—</ng-template>
              </td>
              <td>{{ po.property || po.entity }}</td>
              <td>{{ po.orderDate | date: "mediumDate" }}</td>
              <td>{{ po.requiredBy | date: "mediumDate" }}</td>
              <td>{{ po.lines }}</td>
              <td>{{ po.value | money }}</td>
              <td>
                <span class="badge" [ngClass]="getStatusBadge(po.status)">{{
                  getStatusKey(po.status) | translate
                }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div *ngIf="filteredPOs.length === 0" class="empty-state">
        <div class="empty-icon">📋</div>
        <div class="empty-title">{{ "purchaseOrders.emptyTitle" | translate }}</div>
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
            getStatusKey(selectedPO.status) | translate
          }}</span>
          <button class="btn btn-sm" (click)="selectedPO = null">✕</button>
        </div>

        <div class="drawer-body">
          <div class="po-meta">
            <div><strong>{{ "purchaseOrders.orderDate" | translate }}:</strong> {{ selectedPO.orderDate | date: "mediumDate" }}</div>
            <div><strong>{{ "purchaseOrders.requiredBy" | translate }}:</strong> {{ selectedPO.requiredBy | date: "mediumDate" }}</div>
            <div>
              <strong>{{ "purchaseOrders.totalValue" | translate }}:</strong> {{ selectedPO.value | money }}
            </div>
          </div>

          <h3>{{ "purchaseOrders.lineItems" | translate }}</h3>
          <table class="data-table">
            <thead>
              <tr>
                <th>{{ "purchaseOrders.item" | translate }}</th>
                <th>{{ "purchaseOrders.qty" | translate }}</th>
                <th>{{ "purchaseOrders.uom" | translate }}</th>
                <th>{{ "purchaseOrders.unitPrice" | translate }}</th>
                <th>{{ "purchaseOrders.lineTotal" | translate }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let line of selectedPO.lineItems">
                <td>{{ line.item }}</td>
                <td>{{ line.qty }}</td>
                <td>{{ line.uom }}</td>
                <td>{{ line.unitPrice | money }}</td>
                <td>{{ line.lineTotal | money }}</td>
              </tr>
            </tbody>
          </table>

          <!-- Actions -->
          <div *ngIf="selectedPO.status === 'New'" class="action-zone">
            <h3>{{ "purchaseOrders.actions" | translate }}</h3>
            <div class="action-buttons">
              <button class="btn btn-primary" (click)="acknowledgePo()">
                {{ "purchaseOrders.acknowledgeInFull" | translate }}
              </button>
              <button
                class="btn btn-secondary"
                (click)="showPartialDialog = true"
              >
                {{ "purchaseOrders.partiallyAccept" | translate }}
              </button>
              <button
                class="btn"
                style="color: var(--color-error)"
                (click)="showUnableDialog = true"
              >
                {{ "purchaseOrders.unableToSupply" | translate }}
              </button>
            </div>
          </div>

          <div *ngIf="selectedPO.status === 'Acknowledged'" class="action-zone">
            <button
              class="btn btn-primary"
              routerLink="/purchase-orders/{{ selectedPO.id }}/delivery-note"
            >
              {{ "purchaseOrders.raiseDeliveryNote" | translate }}
            </button>
          </div>

          <!-- Partial Accept Dialog -->
          <div *ngIf="showPartialDialog" class="inline-dialog">
            <h4>{{ "purchaseOrders.partialAcceptance" | translate }}</h4>
            <div
              *ngFor="let line of selectedPO.lineItems; let i = index"
              class="partial-row"
            >
              <span>{{ line.item }}</span>
              <span>{{ "purchaseOrders.ordered" | translate: { qty: line.qty } }}</span>
              <input
                type="number"
                class="form-control inline-input"
                [(ngModel)]="acceptedQtys[i]"
                [max]="line.qty"
              />
              <input
                class="form-control inline-input"
                [placeholder]="'purchaseOrders.reasonIfShort' | translate"
                [(ngModel)]="acceptReasons[i]"
              />
            </div>
            <div class="action-buttons">
              <button class="btn btn-primary" (click)="confirmPartial()">
                {{ "purchaseOrders.confirm" | translate }}
              </button>
              <button
                class="btn btn-secondary"
                (click)="showPartialDialog = false"
              >
                {{ "purchaseOrders.cancel" | translate }}
              </button>
            </div>
          </div>

          <!-- Unable to Supply Dialog -->
          <div *ngIf="showUnableDialog" class="inline-dialog">
            <h4>{{ "purchaseOrders.unableToSupply" | translate }}</h4>
            <div class="form-group">
              <label>{{ "purchaseOrders.reason" | translate }}</label>
              <textarea
                class="form-control"
                [(ngModel)]="unableReason"
                [placeholder]="'purchaseOrders.reasonPlaceholder' | translate"
              ></textarea>
            </div>
            <div class="action-buttons">
              <button
                class="btn"
                style="background: var(--color-error); color: white"
                (click)="confirmUnable()"
              >
                {{ "purchaseOrders.confirm" | translate }}
              </button>
              <button
                class="btn btn-secondary"
                (click)="showUnableDialog = false"
              >
                {{ "purchaseOrders.cancel" | translate }}
              </button>
            </div>
          </div>
        </div>

        <!-- Toast -->
        <div *ngIf="toast" class="toast" [ngClass]="'toast-' + toast.type">
          {{ toast.message | translate }}
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
        color: var(--color-heading);
      }
      .page-subtitle {
        font-size: 13px;
        color: var(--color-text-secondary);
        margin-top: 4px;
      }
      .notice {
        padding: 16px;
        margin-bottom: 16px;
        font-size: 13px;
        color: var(--color-text-secondary);
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .notice.error {
        color: var(--color-error);
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
        background: var(--color-surface);
        color: var(--color-text);
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
      .top-items {
        max-width: 260px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 12px;
        color: var(--color-text-secondary);
      }
      .more-count {
        color: var(--color-text-muted);
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
        /* Above the fixed topbar (z-index 200) so the drawer header — PO number,
           status badge and close button — isn't clipped behind it. */
        z-index: 300;
        display: flex;
        justify-content: flex-end;
      }
      .drawer {
        width: 700px;
        max-width: 90vw;
        background: var(--color-surface);
        color: var(--color-text);
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
        position: sticky;
        top: 0;
        background: var(--color-surface);
        z-index: 1;
        h2 {
          font-size: 18px;
          font-weight: 700;
        }
        p {
          font-size: 13px;
          color: var(--color-text-secondary);
        }
      }
      /* Title block grows so the status badge + close button sit at the right. */
      .drawer-header > div:first-child {
        flex: 1;
      }
      .drawer-header .btn-sm {
        font-size: 16px;
        line-height: 1;
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

      @media (max-width: 640px) {
        .chip {
          padding: 4px 10px;
          font-size: 11px;
        }
      }
    `,
  ],
})
export class PurchaseOrdersComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private propertyCtx = inject(PropertyContextService);

  searchTerm = "";
  statusFilter = "";
  selectedPO: any = null;
  showPartialDialog = false;
  showUnableDialog = false;
  acceptedQtys: number[] = [];
  acceptReasons: string[] = [];
  unableReason = "";
  toast: any = null;

  loading = false;
  loadError: string | null = null;
  busy = false;
  pos: any[] = [];

  filters = [
    { label: "purchaseOrders.filterAll", value: "" },
    { label: "purchaseOrders.filterNew", value: "New" },
    { label: "purchaseOrders.filterAcknowledged", value: "Acknowledged" },
    { label: "purchaseOrders.filterDelivered", value: "Delivered" },
  ];

  get vendorId(): string | null {
    return this.auth.user()?.vendorId ?? null;
  }
  get hasVendor(): boolean {
    return !!this.vendorId;
  }

  constructor() {
    // Re-load whenever the topbar property switcher changes (including the initial
    // value), so "one property selected" immediately scopes the PO list to it.
    effect(() => {
      this.propertyCtx.selectedPropertyId();
      this.load();
    });
  }

  ngOnInit(): void {}

  load(): void {
    const vid = this.vendorId;
    if (!vid) return;
    this.loading = true;
    this.loadError = null;
    const propertyId = this.propertyCtx.selectedPropertyId();
    this.api.getPurchaseOrders(vid, undefined, 1, propertyId).subscribe({
      next: (res: any) => {
        const items = res?.items ?? res ?? [];
        this.pos = items.map((p: any) => this.mapPo(p));
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.loadError = this.extractError(err);
      },
    });
  }

  private mapPo(p: any) {
    const topItems = (p.topItems ?? []).map((l: any) => ({
      description: l.itemDescription,
      lineTotal: l.lineTotal,
    }));
    return {
      id: p.id,
      poNumber: p.poNumber,
      entity: p.entityName ?? "—",
      property: p.propertyName ?? "",
      orderDate: p.orderDate,
      requiredBy: p.requiredByDate,
      lines: p.lineCount ?? 0,
      topItems,
      topItemsSummary: topItems.map((t: any) => t.description).join(", "),
      value: p.totalValue,
      status: p.status,
      lineItems: [] as any[],
    };
  }

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
      PartiallyAccepted: "badge-warning",
      UnableToSupply: "badge-error",
    };
    return map[status] || "badge-muted";
  }

  getStatusKey(status: string): string {
    const map: Record<string, string> = {
      New: "purchaseOrders.statusNew",
      Acknowledged: "purchaseOrders.statusAcknowledged",
      Delivered: "purchaseOrders.statusDelivered",
      PartiallyAccepted: "purchaseOrders.statusPartiallyAccepted",
      UnableToSupply: "purchaseOrders.statusUnableToSupply",
    };
    return map[status] || status;
  }

  openDetail(po: any) {
    this.selectedPO = po;
    this.showPartialDialog = false;
    this.showUnableDialog = false;
    // Fetch full detail (incl. line items) for the drawer.
    this.api.getPurchaseOrder(po.id).subscribe({
      next: (d: any) => {
        const lineItems = (d?.lines ?? []).map((l: any) => ({
          id: l.id,
          item: l.itemDescription,
          qty: l.qtyOrdered,
          uom: l.uom,
          unitPrice: l.unitPrice,
          lineTotal: l.lineTotal,
        }));
        this.selectedPO = { ...po, lineItems };
        this.acceptedQtys = lineItems.map((l: any) => l.qty);
        this.acceptReasons = lineItems.map(() => "");
      },
      error: () => {
        this.selectedPO = { ...po, lineItems: [] };
      },
    });
  }

  acknowledgePo() {
    if (!this.selectedPO || this.busy) return;
    this.busy = true;
    this.api.acknowledgePo(this.selectedPO.id).subscribe({
      next: () => {
        this.onActionDone("Acknowledged", "purchaseOrders.toastAcknowledged");
        setTimeout(() => (this.selectedPO = null), 1200);
      },
      error: (err) => this.onActionError(err),
    });
  }

  confirmPartial() {
    if (!this.selectedPO || this.busy) return;
    this.busy = true;
    const lines = (this.selectedPO.lineItems ?? []).map((l: any, i: number) => ({
      lineId: l.id,
      acceptedQty: this.acceptedQtys[i],
      reason: this.acceptReasons[i] || null,
    }));
    this.api.partialAcceptPo(this.selectedPO.id, lines).subscribe({
      next: () => {
        this.showPartialDialog = false;
        this.onActionDone(
          "PartiallyAccepted",
          "purchaseOrders.toastPartialConfirmed",
        );
      },
      error: (err) => this.onActionError(err),
    });
  }

  confirmUnable() {
    if (!this.selectedPO || this.busy) return;
    this.busy = true;
    this.api
      .unableToSupplyPo(this.selectedPO.id, this.unableReason)
      .subscribe({
        next: () => {
          this.showUnableDialog = false;
          this.onActionDone(
            "UnableToSupply",
            "purchaseOrders.toastUnableRecorded",
          );
        },
        error: (err) => this.onActionError(err),
      });
  }

  private onActionDone(newStatus: string, messageKey: string) {
    this.busy = false;
    if (this.selectedPO) this.selectedPO.status = newStatus;
    // reflect in the list too
    const row = this.pos.find((p) => p.id === this.selectedPO?.id);
    if (row) row.status = newStatus;
    this.showToast("success", messageKey);
  }

  private onActionError(err: any) {
    this.busy = false;
    this.showToast("error", this.extractError(err));
  }

  private extractError(err: any): string {
    return (
      err?.error?.error?.message ??
      err?.error?.error ??
      err?.error?.message ??
      err?.message ??
      "Something went wrong. Please try again."
    );
  }

  showToast(type: string, message: string) {
    this.toast = { type, message };
    setTimeout(() => (this.toast = null), 3000);
  }
}
