import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { TranslatePipe } from "@ngx-translate/core";

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
          {{ "deliveryNote.againstPo" | translate: { poNumber } }} · Sofitel Delhi
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
          [disabled]="!deliveryDate"
        >
          {{ "deliveryNote.submit" | translate }}
        </button>
      </div>

      <div *ngIf="submitted" class="success-banner">
        ✅ {{ "deliveryNote.successBanner" | translate }}
      </div>
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
        color: var(--color-primary);
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
        background: #eef2ff;
        border-radius: 8px;
        font-size: 12px;
        color: var(--color-primary);
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
        background: #dcfce7;
        border-radius: 8px;
        font-size: 13px;
        color: #166534;
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
export class DeliveryNoteBuilderComponent {
  poNumber = "PO-20250701-001";
  deliveryDate = "";
  timeStart = "";
  timeEnd = "";
  selectedFile = "";
  submitted = false;

  lines = [
    {
      item: "Basmati Rice 25kg",
      orderedQty: 30,
      deliveredSoFar: 0,
      qtyInDelivery: 0,
      batchLot: "",
      expiryDate: "",
    },
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
  ) {
    this.route.params.subscribe((p) => {
      if (p["poId"]) this.poNumber = "PO-" + p["poId"].substring(0, 8);
    });
  }

  onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.selectedFile = input.files[0].name;
    }
  }

  submitDn() {
    this.submitted = true;
  }
}
