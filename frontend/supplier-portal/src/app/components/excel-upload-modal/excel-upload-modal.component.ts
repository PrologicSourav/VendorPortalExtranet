import { Component, EventEmitter, Input, Output } from "@angular/core";
import { CommonModule } from "@angular/common";
import { TranslatePipe } from "@ngx-translate/core";

export interface ExcelUploadColumn {
  key: string;
  labelKey: string;
}

export interface ExcelUploadRow {
  rowNumber: number;
  valid: boolean;
  errors: string[];
  [key: string]: unknown;
}

export interface ExcelUploadParseResult {
  rows: ExcelUploadRow[];
  validCount: number;
  invalidCount: number;
}

/**
 * Generic bulk-Excel-upload modal: file picker → parse → validate → preview → confirm.
 * All data-shape-specific work (parsing, validation, template, error report) is
 * delegated to the inputs below, so this shell can be reused for any row type.
 */
@Component({
  selector: "excel-upload-modal",
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <div class="modal-backdrop" (click)="onCancel()">
      <div
        class="upload-modal"
        (click)="$event.stopPropagation()"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="titleKey | translate"
      >
        <div class="modal-header">
          <h3>{{ titleKey | translate }}</h3>
          <button
            class="btn btn-sm"
            (click)="onCancel()"
            [attr.aria-label]="'excelUpload.close' | translate"
          >
            ✕
          </button>
        </div>

        <div class="modal-body">
          <div class="upload-layout">
            <!-- Upload panel -->
            <div class="upload-panel">
              <div
                class="drop-zone"
                [class.dragover]="isDragOver"
                (dragover)="onDragOver($event)"
                (dragleave)="isDragOver = false"
                (drop)="onDrop($event)"
              >
                <label for="excelFileInput" class="drop-zone-label">
                  <span class="drop-icon">📄</span>
                  <span>{{ "excelUpload.dropOrClick" | translate }}</span>
                  <span class="drop-hint">{{
                    "excelUpload.fileHint" | translate
                  }}</span>
                </label>
                <input
                  id="excelFileInput"
                  type="file"
                  accept=".xlsx"
                  hidden
                  (change)="onFileSelected($event)"
                  [attr.aria-label]="'excelUpload.chooseFile' | translate"
                />
              </div>

              <div *ngIf="fileError" class="file-error" role="alert">
                {{ fileError | translate }}
              </div>

              <div
                *ngIf="parsing"
                class="parsing-status"
                aria-live="polite"
                role="status"
              >
                <span class="spinner" aria-hidden="true"></span>
                {{ "excelUpload.parsing" | translate }}
              </div>

              <button
                class="btn btn-secondary btn-block"
                type="button"
                (click)="onDownloadTemplate()"
                [disabled]="downloadingTemplate"
              >
                📥 {{ "excelUpload.downloadTemplate" | translate }}
              </button>
            </div>

            <!-- Preview panel -->
            <div class="preview-panel" *ngIf="result">
              <div class="preview-summary" aria-live="polite">
                {{
                  "excelUpload.summary"
                    | translate
                      : {
                          valid: result.validCount,
                          invalid: result.invalidCount,
                        }
                }}
                <button
                  *ngIf="result.invalidCount > 0"
                  class="btn btn-sm"
                  type="button"
                  (click)="onDownloadErrorReport()"
                >
                  {{ "excelUpload.downloadErrorReport" | translate }}
                </button>
              </div>

              <div class="table-wrap">
                <table class="data-table preview-table">
                  <thead>
                    <tr>
                      <th>{{ "excelUpload.rowColumn" | translate }}</th>
                      <th *ngFor="let col of columns">
                        {{ col.labelKey | translate }}
                      </th>
                      <th>{{ "excelUpload.statusColumn" | translate }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      *ngFor="let row of result.rows"
                      [class.row-invalid]="!row.valid"
                    >
                      <td>{{ row.rowNumber }}</td>
                      <td *ngFor="let col of columns">{{ row[col.key] }}</td>
                      <td>
                        <span
                          class="badge"
                          [ngClass]="row.valid ? 'badge-success' : 'badge-error'"
                        >
                          {{
                            (row.valid
                              ? "excelUpload.statusValid"
                              : "excelUpload.statusInvalid"
                            ) | translate
                          }}
                        </span>
                        <ul
                          *ngIf="!row.valid"
                          class="row-errors"
                          [attr.aria-label]="
                            'excelUpload.rowErrorsLabel' | translate
                          "
                        >
                          <li *ngFor="let err of row.errors">
                            {{ err | translate }}
                          </li>
                        </ul>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" type="button" (click)="onCancel()">
            {{ "excelUpload.cancel" | translate }}
          </button>
          <button
            class="btn btn-primary"
            type="button"
            [disabled]="!result || result.validCount === 0"
            (click)="onConfirm()"
          >
            {{
              "excelUpload.proceed"
                | translate: { count: result?.validCount ?? 0 }
            }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .upload-modal {
        background: var(--color-surface);
        color: var(--color-text);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-lg);
        width: 95%;
        max-width: 960px;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      .modal-header {
        padding: 16px 20px;
        border-bottom: 1px solid var(--color-border-light);
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-shrink: 0;
      }
      .modal-header h3 {
        font-size: 16px;
        font-weight: 600;
      }
      .modal-body {
        padding: 20px;
        overflow-y: auto;
        flex: 1;
      }
      .modal-footer {
        padding: 16px 20px;
        border-top: 1px solid var(--color-border-light);
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        flex-shrink: 0;
      }

      .upload-layout {
        display: grid;
        grid-template-columns: 280px 1fr;
        gap: 20px;
        align-items: start;
      }
      @media (max-width: 1023px) {
        .upload-layout {
          grid-template-columns: 1fr;
        }
      }

      .upload-panel {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .drop-zone {
        border: 2px dashed var(--color-border);
        border-radius: 8px;
        padding: 24px 12px;
        text-align: center;
        transition: border-color 0.15s ease, background 0.15s ease;
      }
      .drop-zone.dragover {
        border-color: var(--color-primary);
        background: var(--color-surface-active);
      }
      .drop-zone-label {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        cursor: pointer;
        font-size: 13px;
        color: var(--color-text-secondary);
      }
      .drop-icon {
        font-size: 28px;
      }
      .drop-hint {
        font-size: 11px;
        color: var(--color-text-muted);
      }
      .file-error {
        color: var(--color-error);
        font-size: 12px;
      }
      .parsing-status {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        color: var(--color-text-secondary);
      }
      .spinner {
        width: 14px;
        height: 14px;
        border: 2px solid var(--color-border);
        border-top-color: var(--color-primary);
        border-radius: 50%;
        animation: spin 0.7s linear infinite;
      }
      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
      .btn-block {
        width: 100%;
      }

      .preview-panel {
        min-width: 0;
      }
      .preview-summary {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 13px;
        margin-bottom: 10px;
        flex-wrap: wrap;
        gap: 8px;
      }
      .table-wrap {
        overflow-x: auto;
        max-height: 400px;
        overflow-y: auto;
        border: 1px solid var(--color-border-light);
        border-radius: 8px;
      }
      .preview-table th {
        position: sticky;
        top: 0;
      }
      .row-invalid {
        background: var(--color-error-soft-bg);
      }
      .row-errors {
        margin: 4px 0 0;
        padding-left: 16px;
        font-size: 11px;
        color: var(--color-error);
      }

      @media (max-width: 640px) {
        .upload-modal {
          width: 100%;
          max-height: 100vh;
          border-radius: 0;
        }
        .modal-footer {
          flex-direction: column;
        }
        .modal-footer .btn {
          width: 100%;
        }
        .preview-summary {
          flex-direction: column;
          align-items: flex-start;
        }
      }
    `,
  ],
})
export class ExcelUploadModalComponent {
  @Input() titleKey = "excelUpload.title";
  @Input() columns: ExcelUploadColumn[] = [];
  @Input() validateFile!: (file: File) => string | null;
  @Input() parseFile!: (file: File) => Promise<ExcelUploadParseResult>;
  @Input() downloadTemplateFn!: () => Promise<Blob>;
  @Input() templateFilename = "template.xlsx";
  @Input() buildErrorReportFn?: (rows: ExcelUploadRow[]) => Blob;

  @Output() cancelled = new EventEmitter<void>();
  @Output() confirmed = new EventEmitter<ExcelUploadRow[]>();

  isDragOver = false;
  parsing = false;
  downloadingTemplate = false;
  fileError: string | null = null;
  result: ExcelUploadParseResult | null = null;

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = true;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
    const file = event.dataTransfer?.files?.[0];
    if (file) this.handleFile(file);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.handleFile(file);
    input.value = "";
  }

  private async handleFile(file: File): Promise<void> {
    this.fileError = null;
    this.result = null;

    const validationError = this.validateFile(file);
    if (validationError) {
      this.fileError = validationError;
      return;
    }

    this.parsing = true;
    try {
      this.result = await this.parseFile(file);
    } catch (err) {
      this.fileError =
        err instanceof Error ? err.message : "excelUpload.errorParseFailed";
    } finally {
      this.parsing = false;
    }
  }

  async onDownloadTemplate(): Promise<void> {
    this.downloadingTemplate = true;
    try {
      const blob = await this.downloadTemplateFn();
      this.triggerDownload(blob, this.templateFilename);
    } finally {
      this.downloadingTemplate = false;
    }
  }

  onDownloadErrorReport(): void {
    if (!this.result || !this.buildErrorReportFn) return;
    const blob = this.buildErrorReportFn(this.result.rows);
    this.triggerDownload(blob, "catalogue-upload-errors.csv");
  }

  private triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Revoking too soon races the browser's download handling for blob:
    // URLs (silently fails, notably in Firefox) — give it real headroom.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  onCancel(): void {
    this.cancelled.emit();
  }

  onConfirm(): void {
    if (!this.result) return;
    this.confirmed.emit(this.result.rows.filter((r) => r.valid));
  }
}
