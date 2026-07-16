import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";
import { FormsModule } from "@angular/forms";

@Component({
  selector: "app-delivery-note-builder",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="page-header">
      <div>
        <a class="back-link" routerLink="/purchase-orders"
          >← Back to Purchase Orders</a
        >
        <h1>Create Delivery Note</h1>
        <p class="page-subtitle">Against PO {{ poNumber }} · Sofitel Delhi</p>
      </div>
    </div>

    <div class="card">
      <div class="card-header">Delivery Details</div>
      <div class="card-body">
        <div class="form-grid">
          <div class="form-group">
            <label>Expected Delivery Date</label>
            <input
              type="date"
              class="form-control"
              [(ngModel)]="deliveryDate"
            />
          </div>
          <div class="form-group">
            <label>Time Window</label>
            <div style="display: flex; gap: 8px; align-items: center">
              <input type="time" class="form-control" [(ngModel)]="timeStart" />
              <span>to</span>
              <input type="time" class="form-control" [(ngModel)]="timeEnd" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="card" style="margin-top: 16px">
      <div class="card-header">Line Items</div>
      <div class="card-body">
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Ordered Qty</th>
                <th>Delivered So Far</th>
                <th>Qty in This Delivery</th>
                <th>Batch/Lot #</th>
                <th>Expiry Date</th>
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
                    ⚠ Exceeds remaining ({{
                      line.orderedQty - line.deliveredSoFar
                    }})
                  </span>
                </td>
                <td>
                  <input
                    class="form-control inline-input"
                    [(ngModel)]="lines[i].batchLot"
                    placeholder="Optional"
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
        <div class="card-header">Supporting Document</div>
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
              <span *ngIf="!selectedFile"
                >Click to upload a delivery document</span
              >
              <span *ngIf="selectedFile">{{ selectedFile }}</span>
            </label>
          </div>
        </div>
      </div>

      <div class="info-banner">
        ℹ️ This delivery note notifies stores of an expected receipt. Goods are
        formally received via the buyer's GRN.
      </div>

      <div class="form-actions">
        <button class="btn btn-secondary" routerLink="/purchase-orders">
          Cancel
        </button>
        <button
          class="btn btn-primary"
          (click)="submitDn()"
          [disabled]="!deliveryDate"
        >
          Submit Delivery Note
        </button>
      </div>

      <div *ngIf="submitted" class="success-banner">
        ✅ Delivery note submitted successfully. The buyer's stores team will
        see it as a pending receipt.
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
