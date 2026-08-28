import { Component, inject, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { TranslatePipe, TranslateService } from "@ngx-translate/core";
import { ApiService } from "../../services/api.service";
import { AuthService } from "../../services/auth.service";

@Component({
  selector: "app-delivery-note-builder",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslatePipe],
  template: `
    <div class="page-header">
      <div>
        <a class="back-link" routerLink="/purchase-orders"
          >← {{ "deliveryNote.backToPurchaseOrders" | translate }}</a
        >
        <h1>{{ "deliveryNote.title" | translate }}</h1>
        <p class="page-subtitle">
          {{ "deliveryNote.againstPo" | translate: { poNumber } }}
          <span *ngIf="propertyName"> · {{ propertyName }}</span>
        </p>
      </div>
    </div>

    <div class="card">
      <div class="card-header">{{ "deliveryNote.deliveryDetails" | translate }}</div>
      <div class="card-body">
        <div class="form-grid">
          <div class="form-group">
            <label>{{ "deliveryNote.expectedDeliveryDate" | translate }}</label>
            <input
              type="date"
              class="form-control"
              [(ngModel)]="deliveryDate"
            />
          </div>
          <div class="form-group">
            <label>{{ "deliveryNote.timeWindow" | translate }}</label>
            <div class="time-window">
              <input type="time" class="form-control" [(ngModel)]="timeStart" />
              <span>{{ "deliveryNote.to" | translate }}</span>
              <input type="time" class="form-control" [(ngModel)]="timeEnd" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="card" style="margin-top: 16px">
      <div class="card-header">{{ "deliveryNote.lineItems" | translate }}</div>
      <div class="card-body">
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>{{ "deliveryNote.item" | translate }}</th>
                <th>{{ "deliveryNote.orderedQty" | translate }}</th>
                <th>{{ "deliveryNote.deliveredSoFar" | translate }}</th>
                <th>{{ "deliveryNote.qtyInThisDelivery" | translate }}</th>
                <th>{{ "deliveryNote.batchLot" | translate }}</th>
                <th>{{ "deliveryNote.expiryDate" | translate }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let line of lines; let i = index">
                <td>{{ line.item }}</td>
                <td>{{ line.orderedQty }}</td>
                <td>{{ line.deliveredSoFar }}</td>
                <td>
                  <input
                    type="number"
                    class="form-control inline-input"
                    [(ngModel)]="lines[i].qtyInDelivery"
                    [max]="line.orderedQty - line.deliveredSoFar"
                  />
                  <span
                    *ngIf="
                      lines[i].qtyInDelivery >
                      line.orderedQty - line.deliveredSoFar
                    "
                    class="field-warning"
                  >
                    ⚠
                    {{
                      "deliveryNote.exceedsRemaining"
                        | translate: { remaining: line.orderedQty - line.deliveredSoFar }
                    }}
                  </span>
                </td>
                <td>
                  <input
                    class="form-control inline-input"
                    [(ngModel)]="lines[i].batchLot"
                    [placeholder]="'deliveryNote.optional' | translate"
                  />
                </td>
                <td>
                  <input
                    type="date"
                    class="form-control inline-input"
                    [(ngModel)]="lines[i].expiryDate"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="card" style="margin-top: 16px">
        <div class="card-header">{{ "deliveryNote.supportingDocument" | translate }}</div>
        <div class="card-body">
          <div class="upload-area">
            <input
              type="file"
              id="fileUpload"
              (change)="onFileSelect($event)"
              hidden
            />
            <label for="fileUpload" class="upload-label">
              📎
              <span *ngIf="!selectedFile">{{
                "deliveryNote.clickToUpload" | translate
              }}</span>
              <span *ngIf="selectedFile">{{ selectedFile }}</span>
            </label>
          </div>
        </div>
      </div>

      <div class="info-banner">
        ℹ️ {{ "deliveryNote.infoBanner" | translate }}
      </div>

      <div class="form-actions">
        <button class="btn btn-secondary" routerLink="/purchase-orders">
          {{ "deliveryNote.cancel" | translate }}
        </button>
        <button
          class="btn btn-primary"
          (click)="submitDn()"
          [disabled]="!deliveryDate || busy"
        >
          {{ "deliveryNote.submit" | translate }}
        </button>
      </div>

      <div *ngIf="submitted" class="success-banner">
        ✅ {{ "deliveryNote.successBanner" | translate }}
      </div>
      <div *ngIf="errorMsg" class="error-banner">⚠️ {{ errorMsg }}</div>
    </div>
  `,
  styles: [
    `
      .page-header {
        margin-bottom: 20px;
      }
      .back-link {
        font-size: 12px;
        color: var(--color-text-muted);
        text-decoration: none;
        display: block;
        margin-bottom: 8px;
      }
      .back-link:hover {
        color: var(--color-heading);
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
      .form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }
      .inline-input {
        width: 140px;
        padding: 6px 8px;
        font-size: 12px;
      }
      .table-wrap {
        overflow-x: auto;
      }
      .field-warning {
        color: var(--color-warning);
        font-size: 11px;
        margin-left: 8px;
      }
      .upload-area {
        border: 2px dashed var(--color-border);
        border-radius: 8px;
        padding: 24px;
        text-align: center;
      }
      .upload-label {
        cursor: pointer;
        font-size: 13px;
        color: var(--color-text-secondary);
      }
      .info-banner {
        margin-top: 16px;
        padding: 12px 16px;
        background: var(--color-surface-active);
        border-radius: 8px;
        font-size: 12px;
        color: var(--color-heading);
      }
      .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 20px;
      }
      .success-banner {
        margin-top: 16px;
        padding: 16px;
        background: var(--color-success-soft-bg);
        border-radius: 8px;
        font-size: 13px;
        color: var(--color-success-soft-text);
        font-weight: 500;
      }
      .error-banner {
        margin-top: 16px;
        padding: 16px;
        background: var(--color-error-soft-bg);
        border-radius: 8px;
        font-size: 13px;
        color: var(--color-error-soft-text);
        font-weight: 500;
      }
      .time-window {
        display: flex;
        gap: 8px;
        align-items: center;
      }

      @media (max-width: 768px) {
        .form-grid {
          grid-template-columns: 1fr;
        }
        .form-actions {
          flex-direction: column;
        }
        .form-actions .btn {
          width: 100%;
        }
        .inline-input {
          width: 100%;
        }
      }

      @media (max-width: 640px) {
        .form-grid .form-group > div[style*="flex"] {
          flex-direction: column;
          align-items: stretch;
        }
        .upload-area {
          padding: 16px;
        }
      }
    `,
  ],
})
export class DeliveryNoteBuilderComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private translate = inject(TranslateService);

  poId = "";
  poNumber = "";
  propertyName = "";
  deliveryDate = "";
  timeStart = "";
  timeEnd = "";
  selectedFile = "";
  submitted = false;
  busy = false;
  errorMsg: string | null = null;

  lines: any[] = [];

  ngOnInit(): void {
    this.route.params.subscribe((p) => {
      this.poId = p["poId"];
      if (this.poId) this.loadPo();
    });
  }

  private loadPo(): void {
    this.api.getPurchaseOrder(this.poId).subscribe({
      next: (po: any) => {
        this.poNumber = po?.poNumber ?? "PO-" + this.poId.substring(0, 8);
        this.propertyName = po?.propertyName ?? "";
        this.lines = (po?.lines ?? []).map((l: any) => {
          const remaining = (l.qtyOrdered ?? 0) - (l.qtyDelivered ?? 0);
          return {
            purchaseOrderLineId: l.id,
            item: l.itemDescription,
            orderedQty: l.qtyOrdered,
            deliveredSoFar: l.qtyDelivered ?? 0,
            qtyInDelivery: remaining > 0 ? remaining : 0,
            batchLot: "",
            expiryDate: "",
          };
        });
      },
      error: () => {
        this.errorMsg = this.translate.instant("deliveryNote.loadError");
      },
    });
  }

  onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.selectedFile = input.files[0].name;
    }
  }

  submitDn() {
    if (this.busy || !this.deliveryDate) return;
    const dnLines = this.lines
      .filter((l) => l.qtyInDelivery > 0)
      .map((l) => ({
        purchaseOrderLineId: l.purchaseOrderLineId,
        itemDescription: l.item,
        qtyInDelivery: l.qtyInDelivery,
        batchLotNumber: l.batchLot || null,
        expiryDate: l.expiryDate || null,
      }));
    if (dnLines.length === 0) {
      this.errorMsg = this.translate.instant("deliveryNote.noQtyError");
      return;
    }
    this.busy = true;
    this.errorMsg = null;
    const payload = {
      vendorId: this.auth.user()?.vendorId ?? null,
      purchaseOrderId: this.poId,
      expectedDeliveryDate: this.deliveryDate,
      timeWindowStart: this.timeStart || null,
      timeWindowEnd: this.timeEnd || null,
      lines: dnLines,
    };
    // Create the draft ASN, then submit it as a pending receipt.
    this.api.createDeliveryNote(payload).subscribe({
      next: (created: any) => {
        this.api.submitDeliveryNote(created.id).subscribe({
          next: () => {
            this.busy = false;
            this.submitted = true;
            setTimeout(() => this.router.navigate(["/purchase-orders"]), 1500);
          },
          error: (err) => this.onError(err),
        });
      },
      error: (err) => this.onError(err),
    });
  }

  private onError(err: any) {
    this.busy = false;
    this.errorMsg =
      err?.error?.error?.message ??
      err?.error?.error ??
      err?.error?.message ??
      err?.message ??
      this.translate.instant("deliveryNote.submitError");
  }
}
