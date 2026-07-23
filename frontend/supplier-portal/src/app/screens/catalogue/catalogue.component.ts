import { Component, inject, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { TranslatePipe, TranslateService } from "@ngx-translate/core";
import { of, switchMap } from "rxjs";
import {
  ExcelUploadModalComponent,
  ExcelUploadRow,
} from "../../components/excel-upload-modal/excel-upload-modal.component";
import {
  CatalogueExcelRow,
  CatalogueExcelService,
  MAX_DESCRIPTION_LENGTH,
} from "../../services/catalogue-excel.service";

/** Item codes: letters, digits and dashes only — mirrors the rule enforced by
 *  CatalogueExcelService (Excel upload) and the server-side FluentValidation
 *  validator, so manual entry is held to the exact same standard. */
const ITEM_CODE_PATTERN = /^[a-zA-Z0-9-]+$/;
import { ApiService } from "../../services/api.service";
import { AuthService } from "../../services/auth.service";

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
        <span
          class="badge"
          [ngClass]="catalogueStatus === 'Draft' ? 'badge-warning' : 'badge-success'"
        >
          {{ ("catalogue.status" + catalogueStatus) | translate }}
        </span>
        <button
          class="btn btn-primary"
          [disabled]="lines.length === 0 || catalogueStatus !== 'Draft' || submitting || !hasVendor"
          [title]="'catalogue.submitTooltip' | translate"
          (click)="submitForApproval()"
        >
          {{ "catalogue.submitForApproval" | translate }}
        </button>
      </div>
    </div>

    <div *ngIf="loading" class="loading-state">
      {{ "catalogue.loading" | translate }}
    </div>
    <div *ngIf="loadError" class="load-error" role="alert">
      {{ "catalogue.loadError" | translate }}
    </div>
    <div *ngIf="!loading && !hasVendor" class="no-vendor-notice" role="alert">
      {{ "catalogue.noVendorNotice" | translate }}
    </div>

    <ng-container *ngIf="!loading">
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
        <button
          class="btn btn-primary"
          [disabled]="catalogueStatus !== 'Draft' || !hasVendor"
          (click)="openAddDialog()"
        >
          + {{ "catalogue.addLine" | translate }}
        </button>
        <button
          class="btn btn-secondary"
          [disabled]="catalogueStatus !== 'Draft' || !hasVendor"
          (click)="showUploadModal = true"
        >
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
    </ng-container>

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
              <span
                *ngIf="formData.itemCode && !isItemCodeValid"
                class="field-error"
                >{{ "catalogue.itemCodeValidation" | translate }}</span
              >
            </div>
            <div class="form-group">
              <label>{{ "catalogue.description" | translate }}</label>
              <input
                class="form-control"
                [(ngModel)]="formData.description"
                [maxlength]="maxDescriptionLength"
                placeholder="Basmati Rice 25kg"
              />
              <span
                *ngIf="formData.description.length > maxDescriptionLength"
                class="field-error"
                >{{
                  "catalogue.descriptionValidation"
                    | translate: { max: maxDescriptionLength }
                }}</span
              >
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
          <p *ngIf="saveError" class="field-error save-error" role="alert">
            {{ "catalogue.saveError" | translate }} {{ saveError }}
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
              !formData.itemCode ||
              !isItemCodeValid ||
              !formData.description ||
              formData.description.length > maxDescriptionLength ||
              formData.price <= 0 ||
              saving
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

    <div *ngIf="toast" class="toast" [ngClass]="'toast-' + toast.type">
      {{ toast.key ? (toast.key | translate: toast.params) : toast.text }}
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

      .loading-state {
        padding: 40px;
        text-align: center;
        color: var(--color-text-secondary);
        font-size: 13px;
      }
      .load-error {
        padding: 16px;
        border-radius: 8px;
        background: #fef2f2;
        color: var(--color-error);
        font-size: 13px;
        margin-bottom: 16px;
      }
      .save-error {
        margin-top: 8px;
      }
      .no-vendor-notice {
        padding: 16px;
        border-radius: 8px;
        background: #fffbeb;
        color: #92400e;
        border: 1px solid #fde68a;
        font-size: 13px;
        margin-bottom: 16px;
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
export class CatalogueComponent implements OnInit {
  private excelService = inject(CatalogueExcelService);
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private translate = inject(TranslateService);

  searchTerm = "";
  statusFilter = "";
  showAddDialog = false;
  editingLine: any = null;

  showUploadModal = false;
  uploadColumns = CATALOGUE_UPLOAD_COLUMNS;

  catalogueId: string | null = null;
  catalogueStatus = "Draft";
  loading = true;
  loadError = false;
  saving = false;
  submitting = false;
  saveError: string | null = null;
  toast: { type: string; key?: string; params?: any; text?: string } | null = null;

  /** Catalogues are vendor-scoped. Internal/staff accounts (admin) have no vendorId,
   *  so they can't own a "My Catalogue" — guard the write actions rather than firing
   *  a POST with a null vendor that the backend rejects with a confusing FK error. */
  get hasVendor(): boolean {
    return !!this.auth.user()?.vendorId;
  }

  readonly maxDescriptionLength = MAX_DESCRIPTION_LENGTH;

  /** True when the current item code matches the allowed format (letters, digits, dashes). */
  get isItemCodeValid(): boolean {
    return ITEM_CODE_PATTERN.test(this.formData.itemCode);
  }

  validateExcelFile = (file: File) => this.excelService.validateFile(file);
  parseExcelFile = (file: File) => this.excelService.parseAndValidate(file);
  downloadExcelTemplate = () => this.excelService.buildTemplate();
  buildExcelErrorReport = (rows: ExcelUploadRow[]) =>
    this.excelService.buildErrorReportCsv(
      rows as unknown as CatalogueExcelRow[],
    );

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

  lines: any[] = [];

  ngOnInit(): void {
    const vendorId = this.auth.user()?.vendorId;
    if (!vendorId) {
      // No vendor context (e.g. internal staff account) — not a load failure.
      // The template's no-vendor notice explains it; don't also flag loadError.
      this.loading = false;
      return;
    }
    this.api.getCatalogues(vendorId, "Draft").subscribe({
      next: (catalogues: any[]) => {
        const draft = catalogues?.[0];
        if (draft) {
          this.catalogueId = draft.id;
          this.catalogueStatus = draft.status ?? "Draft";
          this.lines = (draft.lines ?? []).map((l: any) => this.mapServerLine(l));
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.loadError = true;
      },
    });
  }

  get filteredLines() {
    return this.lines.filter(
      (l) =>
        (!this.searchTerm ||
          l.description.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
          l.itemCode.toLowerCase().includes(this.searchTerm.toLowerCase())) &&
        (!this.statusFilter || l.status === this.statusFilter),
    );
  }

  openAddDialog(): void {
    this.editingLine = null;
    this.saveError = null;
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
    this.showAddDialog = true;
  }

  editLine(line: any) {
    this.editingLine = line;
    this.formData = { ...line };
    this.saveError = null;
    this.showAddDialog = true;
  }

  deleteLine(line: any) {
    // Local-only for now — there's no DELETE /catalogues/{id}/lines/{lineId} endpoint yet,
    // so this only affects the current view and won't survive a reload.
    this.lines = this.lines.filter((l) => l !== line);
  }

  saveLine(): void {
    if (this.editingLine) {
      // Editing an existing line is local-only too (no update-line endpoint yet) —
      // reflects immediately in the view but a reload will restore the server's values.
      Object.assign(this.editingLine, this.formData);
      this.closeAddDialog();
      return;
    }

    if (!this.hasVendor) {
      this.saveError = this.translate.instant("catalogue.noVendorNotice");
      return;
    }

    this.saving = true;
    this.saveError = null;

    this.ensureCatalogue()
      .pipe(switchMap((id) => this.api.addCatalogueLines(id, [{ ...this.formData }])))
      .subscribe({
        next: (created: any[]) => {
          this.lines.push(...created.map((l) => this.mapServerLine(l)));
          this.saving = false;
          this.closeAddDialog();
        },
        error: (err) => {
          this.saving = false;
          this.saveError = this.extractErrorMessage(err);
        },
      });
  }

  onExcelUploadConfirmed(rows: ExcelUploadRow[]): void {
    if (!this.hasVendor) {
      this.showUploadModal = false;
      this.showToast("error", "catalogue.noVendorNotice");
      return;
    }

    const mapped = rows.map((r) => ({
      itemCode: r["itemCode"] as string,
      description: r["description"] as string,
      packUom: r["packUom"] as string,
      price: r["price"] as number,
      currency: r["currency"] as string,
      validFrom: r["validFrom"] as string,
      validTo: r["validTo"] as string,
      taxClass: r["taxClass"] as string,
    }));

    this.ensureCatalogue()
      .pipe(switchMap((id) => this.api.addCatalogueLines(id, mapped)))
      .subscribe({
        next: (created: any[]) => {
          this.lines.push(...created.map((l) => this.mapServerLine(l)));
          this.showUploadModal = false;
          this.showToast("success", "excelUpload.successToast", { count: created.length });
        },
        error: (err) => {
          this.showToast("error", undefined, undefined, this.extractErrorMessage(err));
        },
      });
  }

  submitForApproval(): void {
    if (!this.catalogueId || this.lines.length === 0 || this.submitting) return;
    this.submitting = true;
    this.api.submitCatalogue(this.catalogueId).subscribe({
      next: () => {
        this.catalogueStatus = "Submitted";
        this.submitting = false;
        this.showToast("success", "catalogue.toastSubmitted");
      },
      error: () => {
        this.submitting = false;
        this.showToast("error", "catalogue.toastSubmitError");
      },
    });
  }

  /** Returns the vendor's Draft catalogue id, creating one on first use. There's no
   *  buying-entity picker in the portal yet, so the API defaults that server-side. */
  private ensureCatalogue() {
    if (this.catalogueId) return of(this.catalogueId);

    const vendorId = this.auth.user()?.vendorId;
    return this.api.createCatalogue(vendorId!).pipe(
      switchMap((created: any) => {
        this.catalogueId = created.id;
        this.catalogueStatus = created.status ?? "Draft";
        return of(created.id as string);
      }),
    );
  }

  private mapServerLine(line: any) {
    return {
      id: line.id,
      itemCode: line.itemCode,
      description: line.description,
      packUom: line.packUom,
      price: line.price,
      currency: line.currency,
      validFrom: this.toDateOnly(line.validFrom),
      validTo: this.toDateOnly(line.validTo),
      taxClass: line.taxClass,
      deviation: line.deviationPercent ?? 0,
      status: line.status ?? "Draft",
    };
  }

  private toDateOnly(value: string): string {
    return value ? value.slice(0, 10) : "";
  }

  private extractErrorMessage(err: any): string {
    const body = err?.error;
    if (body?.errors) {
      // FluentValidation's ModelState-driven ProblemDetails shape: { errors: { Field: ["msg"] } }
      const messages = Object.values(body.errors).flat() as string[];
      if (messages.length) return messages.join(" ");
    }
    // GlobalExceptionMiddleware's shape for unhandled server errors: { error: { message, id, code } }
    if (typeof body?.error?.message === "string") return body.error.message;
    if (typeof body?.message === "string") return body.message;
    if (err?.status === 0) return "Could not reach the server. Check your connection and try again.";
    return "Something went wrong. Please try again.";
  }

  private closeAddDialog(): void {
    this.showAddDialog = false;
    this.editingLine = null;
    this.saveError = null;
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

  private showToast(type: string, key?: string, params?: any, text?: string): void {
    this.toast = { type, key, params, text };
    setTimeout(() => (this.toast = null), 4000);
  }
}
