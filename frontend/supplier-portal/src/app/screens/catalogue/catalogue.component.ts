import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

@Component({
  selector: "app-catalogue",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header">
      <div>
        <h1>My Catalogue</h1>
        <p class="page-subtitle">Manage your price list for the buying group</p>
      </div>
      <div class="header-actions">
        <span class="badge badge-warning">Draft</span>
        <button
          class="btn btn-primary"
          [disabled]="lines.length === 0"
          title="Submit your catalogue for buyer approval"
        >
          Submit for Approval
        </button>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="toolbar">
      <input
        type="text"
        class="form-control search-input"
        placeholder="Search items..."
        [(ngModel)]="searchTerm"
      />
      <select class="form-control filter-select" [(ngModel)]="statusFilter">
        <option value="">All Status</option>
        <option value="Draft">Draft</option>
        <option value="Approved">Approved</option>
      </select>
      <button class="btn btn-primary" (click)="showAddDialog = true">
        + Add Line
      </button>
    </div>

    <!-- Data Table -->
    <div class="card">
      <div class="table-wrap">
        <table class="data-table" *ngIf="lines.length > 0">
          <thead>
            <tr>
              <th>Item Code</th>
              <th>Description</th>
              <th>Pack / UOM</th>
              <th>Price</th>
              <th>Currency</th>
              <th>Valid From</th>
              <th>Valid To</th>
              <th>Tax Class</th>
              <th>Contract Deviation</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let line of filteredLines">
              <td>
                <code>{{ line.itemCode }}</code>
              </td>
              <td>{{ line.description }}</td>
              <td>{{ line.packUom }}</td>
              <td>₹{{ line.price | number: "1.2-2" }}</td>
              <td>{{ line.currency }}</td>
              <td>{{ line.validFrom }}</td>
              <td>{{ line.validTo }}</td>
              <td>{{ line.taxClass }}</td>
              <td>
                <span
                  *ngIf="line.deviation && line.deviation > 0"
                  class="badge badge-error"
                  title="Price deviates from agreed rate contract"
                >
                  Above contract +{{ line.deviation }}%
                </span>
                <span *ngIf="line.deviation === 0" class="badge badge-success"
                  >On contract</span
                >
              </td>
              <td>
                <button
                  class="btn btn-secondary btn-sm"
                  (click)="editLine(line)"
                >
                  Edit
                </button>
                <button
                  class="btn btn-sm"
                  style="color: var(--color-error)"
                  (click)="deleteLine(line)"
                >
                  Delete
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div *ngIf="lines.length === 0" class="empty-state">
        <div class="empty-icon">📦</div>
        <div class="empty-title">No catalogue lines yet</div>
        <div class="empty-desc">
          Add your first item to start building your price list.
        </div>
      </div>
    </div>

    <!-- Add/Edit Dialog -->
    <div
      class="modal-backdrop"
      *ngIf="showAddDialog"
      (click)="showAddDialog = false"
    >
      <div class="modal" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>
            {{ editingLine ? "Edit Catalogue Line" : "Add Catalogue Line" }}
          </h3>
          <button class="btn btn-sm" (click)="showAddDialog = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-grid">
            <div class="form-group">
              <label>Item Code</label>
              <input
                class="form-control"
                [(ngModel)]="formData.itemCode"
                placeholder="FOOD-001"
              />
            </div>
            <div class="form-group">
              <label>Description</label>
              <input
                class="form-control"
                [(ngModel)]="formData.description"
                placeholder="Basmati Rice 25kg"
              />
            </div>
            <div class="form-group">
              <label>Pack / UOM</label>
              <input
                class="form-control"
                [(ngModel)]="formData.packUom"
                placeholder="25kg"
              />
            </div>
            <div class="form-group">
              <label>Price (₹)</label>
              <input
                type="number"
                class="form-control"
                [(ngModel)]="formData.price"
                min="0"
                step="0.01"
              />
              <span *ngIf="formData.price <= 0" class="field-error"
                >Price must be greater than 0</span
              >
            </div>
            <div class="form-group">
              <label>Currency</label>
              <select class="form-control" [(ngModel)]="formData.currency">
                <option value="INR">INR</option>
                <option value="AED">AED</option>
              </select>
            </div>
            <div class="form-group">
              <label>Valid From</label>
              <input
                type="date"
                class="form-control"
                [(ngModel)]="formData.validFrom"
              />
            </div>
            <div class="form-group">
              <label>Valid To</label>
              <input
                type="date"
                class="form-control"
                [(ngModel)]="formData.validTo"
              />
              <span
                *ngIf="
                  formData.validTo &&
                  formData.validFrom &&
                  formData.validTo < formData.validFrom
                "
                class="field-error"
                >Valid-to must be after valid-from</span
              >
            </div>
            <div class="form-group">
              <label>Tax Class</label>
              <select class="form-control" [(ngModel)]="formData.taxClass">
                <option value="GST-5">GST 5%</option>
                <option value="GST-12">GST 12%</option>
                <option value="GST-18">GST 18%</option>
                <option value="GST-0">GST 0%</option>
              </select>
            </div>
          </div>
          <p class="form-note">
            Lines are submitted for buyer approval before becoming orderable.
          </p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="showAddDialog = false">
            Cancel
          </button>
          <button
            class="btn btn-primary"
            (click)="saveLine()"
            [disabled]="
              !formData.itemCode || !formData.description || formData.price <= 0
            "
          >
            {{ editingLine ? "Update" : "Add Line" }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .page-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
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
      .header-actions {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .toolbar {
        display: flex;
        gap: 12px;
        margin-bottom: 16px;
        .search-input {
          width: 280px;
        }
        .filter-select {
          width: 160px;
        }
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

      .form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }
      .field-error {
        color: var(--color-error);
        font-size: 11px;
        margin-top: 4px;
        display: block;
      }
      .form-note {
        font-size: 12px;
        color: var(--color-text-muted);
        margin-top: 12px;
        font-style: italic;
      }
    `,
  ],
})
export class CatalogueComponent {
  searchTerm = "";
  statusFilter = "";
  showAddDialog = false;
  editingLine: any = null;

  formData = {
    itemCode: "",
    description: "",
    packUom: "",
    price: 0,
    currency: "INR",
    validFrom: "",
    validTo: "",
    taxClass: "GST-5",
  };

  lines = [
    {
      itemCode: "FOOD-001",
      description: "Basmati Rice 25kg",
      packUom: "25kg",
      price: 2968,
      currency: "INR",
      validFrom: "2025-01-01",
      validTo: "2025-06-30",
      taxClass: "GST-5",
      deviation: 6,
      status: "Draft",
    },
    {
      itemCode: "FOOD-002",
      description: "Sunflower Oil 15L",
      packUom: "15L",
      price: 1650,
      currency: "INR",
      validFrom: "2025-01-01",
      validTo: "2025-06-30",
      taxClass: "GST-5",
      deviation: 0,
      status: "Draft",
    },
    {
      itemCode: "FOOD-003",
      description: "Tomato Ketchup 1kg",
      packUom: "1kg",
      price: 195,
      currency: "INR",
      validFrom: "2025-01-01",
      validTo: "2025-06-30",
      taxClass: "GST-12",
      deviation: 8.33,
      status: "Draft",
    },
  ];

  get filteredLines() {
    return this.lines.filter(
      (l) =>
        (!this.searchTerm ||
          l.description.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
          l.itemCode.toLowerCase().includes(this.searchTerm.toLowerCase())) &&
        (!this.statusFilter || l.status === this.statusFilter),
    );
  }

  editLine(line: any) {
    this.editingLine = line;
    this.formData = { ...line };
    this.showAddDialog = true;
  }

  deleteLine(line: any) {
    this.lines = this.lines.filter((l) => l !== line);
  }

  saveLine() {
    if (this.editingLine) {
      Object.assign(this.editingLine, this.formData);
    } else {
      this.lines.push({ ...this.formData, deviation: 0, status: "Draft" });
    }
    this.showAddDialog = false;
    this.editingLine = null;
    this.formData = {
      itemCode: "",
      description: "",
      packUom: "",
      price: 0,
      currency: "INR",
      validFrom: "",
      validTo: "",
      taxClass: "GST-5",
    };
  }
}
