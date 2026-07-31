import { Component, OnInit, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
import { TranslatePipe } from "@ngx-translate/core";
import { ApiService } from "../../services/api.service";
import { AuthService } from "../../services/auth.service";

/**
 * Landing screen for the Delivery Note (ASN) menu item: lists the vendor's
 * acknowledged POs so a delivery note can be raised against one. The builder
 * itself lives at /purchase-orders/:poId/delivery-note.
 */
@Component({
  selector: "app-delivery-notes",
  standalone: true,
  imports: [CommonModule, RouterModule, TranslatePipe],
  template: `
    <div class="page-header">
      <h1>{{ "deliveryNotes.title" | translate }}</h1>
      <p class="page-subtitle">{{ "deliveryNotes.subtitle" | translate }}</p>
    </div>

    <div *ngIf="!hasVendor" class="card notice">
      {{ "deliveryNotes.noVendorNotice" | translate }}
    </div>

    <div *ngIf="hasVendor && loading" class="card notice">
      {{ "deliveryNotes.loading" | translate }}
    </div>

    <div class="card" *ngIf="hasVendor && !loading">
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>{{ "deliveryNotes.poNumber" | translate }}</th>
              <th>{{ "deliveryNotes.entity" | translate }}</th>
              <th>{{ "deliveryNotes.requiredBy" | translate }}</th>
              <th>{{ "deliveryNotes.status" | translate }}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let po of pos">
              <td>
                <code>{{ po.poNumber }}</code>
              </td>
              <td>{{ po.entity }}</td>
              <td>{{ po.requiredBy | date: "mediumDate" }}</td>
              <td>
                <span class="badge badge-success">{{ po.status }}</span>
              </td>
              <td>
                <a
                  class="btn btn-sm btn-primary"
                  [routerLink]="[
                    '/purchase-orders',
                    po.id,
                    'delivery-note'
                  ]"
                >
                  {{ "deliveryNotes.raise" | translate }}
                </a>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div *ngIf="pos.length === 0" class="empty-state">
        <div class="empty-icon">🚚</div>
        <div class="empty-title">{{ "deliveryNotes.emptyTitle" | translate }}</div>
        <div class="empty-desc">{{ "deliveryNotes.emptyDesc" | translate }}</div>
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
        font-size: 13px;
        color: var(--color-text-secondary);
      }
      .table-wrap {
        overflow-x: auto;
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
    `,
  ],
})
export class DeliveryNotesComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);

  pos: any[] = [];
  loading = false;

  get hasVendor(): boolean {
    return !!this.auth.user()?.vendorId;
  }

  ngOnInit(): void {
    const vid = this.auth.user()?.vendorId;
    if (!vid) return;
    this.loading = true;
    this.api.getPurchaseOrders(vid).subscribe({
      next: (res: any) => {
        const items = res?.items ?? res ?? [];
        // Acknowledged POs are the ones a delivery note can be raised against.
        this.pos = items
          .filter((p: any) => p.status === "Acknowledged")
          .map((p: any) => ({
            id: p.id,
            poNumber: p.poNumber,
            entity: p.entityName ?? "—",
            requiredBy: p.requiredByDate,
            status: p.status,
          }));
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }
}
