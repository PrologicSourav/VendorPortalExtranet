import { Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { TranslatePipe } from "@ngx-translate/core";
import {
  ExcelUploadModalComponent,
  ExcelUploadRow,
} from "../../components/excel-upload-modal/excel-upload-modal.component";
import {
  CatalogueExcelRow,
  CatalogueExcelService,
} from "../../services/catalogue-excel.service";

const CATALOGUE_UPLOAD_COLUMNS = [
  { key: "itemCode", labelKey: "catalogue.itemCode" },
  { key: "description", labelKey: "catalogue.description" },
  { key: "packUom", labelKey: "catalogue.packUom" },
  { key: "price", labelKey: "catalogue.price" },
  { key: "currency", labelKey: "catalogue.currency" },
  { key: "validFrom", labelKey: "catalogue.validFrom" },
  { key: "validTo", labelKey: "catalogue.validTo" },
  { key: "taxClass", labelKey: "catalogue.taxClass" },
];

@Component({
  selector: "app-catalogue",
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, ExcelUploadModalComponent],
  template: `
    <div class="page-header">
      <div>
        <h1>{{ "catalogue.title" | translate }}</h1>
        <p class="page-subtitle">{{ "catalogue.subtitle" | translate }}</p>
      </div>
      <div class="header-actions">
        <span class="badge badge-warning">{{ "catalogue.statusDraft" | translate }}</span>
        <button
          class="btn btn-primary"
          [disabled]="lines.length === 0"
          [title]="'catalogue.submitTooltip' | translate"
        >
          {{ "catalogue.submitForApproval" | translate }}
        </button>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="toolbar">
      <input
        type="text"
        class="form-control search-input"
        [placeholder]="'catalogue.searchPlaceholder' | translate"
        [(ngModel)]="searchTerm"
      />
      <select class="form-control filter-select" [(ngModel)]="statusFilter">
        <option value="">{{ "catalogue.allStatus" | translate }}</option>
        <option value="Draft">{{ "catalogue.statusDraft" | translate }}</option>
        <option value="Approved">{{ "catalogue.statusApproved" | translate }}</option>
      </select>
      <button class="btn btn-primary" (click)="showAddDialog = true">
        + {{ "catalogue.addLine" | translate }}
      </button>
      <button class="btn btn-secondary" (click)="showUploadModal = true">
        📤 {{ "excelUpload.uploadButton" | translate }}
      </button>
    </div>

    <!-- Data Table -->
    <div class="card">
      <div class="table-wrap">
        <table class="data-table" *ngIf="lines.length > 0">
          <thead>
            <tr>
              <th>{{ "catalogue.itemCode" | translate }}</th>
              <th>{{ "catalogue.description" | translate }}</th>
              <th>{{ "catalogue.packUom" | translate }}</th>
              <th>{{ "catalogue.price" | translate }}</th>
              <th>{{ "catalogue.currency" | translate }}</th>
              <th>{{ "catalogue.validFrom" | translate }}</th>
              <th>{{ "catalogue.validTo" | translate }}</th>
              <th>{{ "catalogue.taxClass" | translate }}</th>
              <th>{{ "catalogue.contractDeviation" | translate }}</th>
              <th>{{ "catalogue.actions" | translate }}</th>
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
                  [title]="'catalogue.deviationTooltip' | translate"
                >
                  {{ "catalogue.aboveContract" | translate: { deviation: line.deviation } }}
                </span>
                <span *ngIf="line.deviation === 0" class="badge badge-success"
                  >{{ "catalogue.onContract" | translate }}</span
                >
              </td>
              <td>
                <button
                  class="btn btn-secondary btn-sm"
                  (click)="editLine(line)"
                >
                  {{ "catalogue.edit" | translate }}
                </button>
                <button
                  class="btn btn-sm"
                  style="color: var(--color-error)"
                  (click)="deleteLine(line)"
                >
                  {{ "catalogue.delete" | translate }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div *ngIf="lines.length === 0" class="empty-state">
        <div class="empty-icon">📦</div>
        <div class="empty-title">{{ "catalogue.emptyTitle" | translate }}</div>
        <div class="empty-desc">
          {{ "catalogue.emptyDesc" | translate }}
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
            {{ (editingLine ? "catalogue.editLine" : "catalogue.addLine") | translate }}
          </h3>
          <button class="btn btn-sm" (click)="showAddDialog = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-grid">
            <div class="form-group">
              <label>{{ "catalogue.itemCode" | translate }}</label>
              <input
                class="form-control"
                [(ngModel)]="formData.itemCode"
                placeholder="FOOD-001"
              />
            </div>
            <div class="form-group">
              <label>{{ "catalogue.description" | translate }}</label>
              <input
                class="form-control"
                [(ngModel)]="formData.description"
                placeholder="Basmati Rice 25kg"
              />
            </div>
            <div class="form-group">
              <label>{{ "catalogue.packUom" | translate }}</label>
              <input
                class="form-control"
                [(ngModel)]="formData.packUom"
                placeholder="25kg"
              />
            </div>
            <div class="form-group">
              <label>{{ "catalogue.priceInr" | translate }}</label>
              <input
                type="number"
                class="form-control"
                [(ngModel)]="formData.price"
                min="0"
                step="0.01"
              />
              <span *ngIf="formData.price <= 0" class="field-error"
                >{{ "catalogue.priceValidation" | translate }}</span
              >
            </div>
            <div class="form-group">
              <label>{{ "catalogue.currency" | translate }}</label>
              <select class="form-control" [(ngModel)]="formData.currency">
                <option value="INR">INR</option>
                <option value="AED">AED</option>
              </select>
            </div>
            <div class="form-group">
              <label>{{ "catalogue.validFrom" | translate }}</label>
              <input
                type="date"
                class="form-control"
                [(ngModel)]="formData.validFrom"
              />
            </div>
            <div class="form-group">
              <label>{{ "catalogue.validTo" | translate }}</label>
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
                >{{ "catalogue.validToValidation" | translate }}</span
              >
            </div>
            <div class="form-group">
              <label>{{ "catalogue.taxClass" | translate }}</label>
              <select class="form-control" [(ngModel)]="formData.taxClass">
                <option value="GST-5">GST 5%</option>
                <option value="GST-12">GST 12%</option>
                <option value="GST-18">GST 18%</option>
                <option value="GST-0">GST 0%</option>
              </select>
            </div>
          </div>
          <p class="form-note">
            {{ "catalogue.formNote" | translate }}
          </p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="showAddDialog = false">
            {{ "catalogue.cancel" | translate }}
          </button>
          <button
            class="btn btn-primary"
            (click)="saveLine()"
            [disabled]="
              !formData.itemCode || !formData.description || formData.price <= 0
            "
          >
            {{ (editingLine ? "catalogue.update" : "catalogue.addLine") | translate }}
          </button>
        </div>
      </div>
    </div>

    <!-- Bulk Excel Upload -->
    <excel-upload-modal
      *ngIf="showUploadModal"
      titleKey="excelUpload.title"
      [columns]="uploadColumns"
      [validateFile]="validateExcelFile"
      [parseFile]="parseExcelFile"
      [downloadTemplateFn]="downloadExcelTemplate"
      [buildErrorReportFn]="buildExcelErrorReport"
      templateFilename="catalogue-upload-template.xlsx"
      (cancelled)="showUploadModal = false"
      (confirmed)="onExcelUploadConfirmed($event)"
    ></excel-upload-modal>

    <div *ngIf="uploadToast" class="toast toast-success">
      {{ "excelUpload.successToast" | translate: { count: uploadToast } }}
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

      @media (max-width: 768px) {
        .page-header {
          flex-direction: column;
          gap: 12px;
        }
        .header-actions {
          width: 100%;
          justify-content: flex-start;
          gap: 8px;
        }
        .toolbar {
          flex-wrap: wrap;
          gap: 8px;
        }
        .toolbar .search-input {
          width: 100%;
          min-width: 0;
        }
        .toolbar .filter-select {
          flex: 1;
          min-width: 120px;
        }
        .form-grid {
          grid-template-columns: 1fr;
        }
      }
      @media (max-width: 480px) {
        .toolbar {
          flex-direction: column;
        }
        .toolbar .btn {
          width: 100%;
        }
        .btn {
          padding: 6px 10px;
          font-size: 12px;
        }
      }
    `,
  ],
})
export class CatalogueComponent {
  private excelService = inject(CatalogueExcelService);

  searchTerm = "";
  statusFilter = "";
  showAddDialog = false;
  editingLine: any = null;

  showUploadModal = false;
  uploadToast: number | null = null;
  uploadColumns = CATALOGUE_UPLOAD_COLUMNS;

  validateExcelFile = (file: File) => this.excelService.validateFile(file);
  parseExcelFile = (file: File) => this.excelService.parseAndValidate(file);
  downloadExcelTemplate = () => this.excelService.buildTemplate();
  buildExcelErrorReport = (rows: ExcelUploadRow[]) =>
    this.excelService.buildErrorReportCsv(
      rows as unknown as CatalogueExcelRow[],
    );

  onExcelUploadConfirmed(rows: ExcelUploadRow[]): void {
    const mapped = rows.map((r) => ({
      itemCode: r["itemCode"] as string,
      description: r["description"] as string,
      packUom: r["packUom"] as string,
      price: r["price"] as number,
      currency: r["currency"] as string,
      validFrom: r["validFrom"] as string,
      validTo: r["validTo"] as string,
      taxClass: r["taxClass"] as string,
      deviation: 0,
      status: "Draft",
    }));
    this.lines.push(...mapped);
    this.showUploadModal = false;
    this.uploadToast = mapped.length;
    setTimeout(() => (this.uploadToast = null), 3000);
  }

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
