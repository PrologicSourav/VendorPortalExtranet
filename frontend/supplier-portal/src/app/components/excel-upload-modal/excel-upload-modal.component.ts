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
  warnings?: string[];
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
  templateUrl: "./excel-upload-modal.component.html",
  styleUrl: "./excel-upload-modal.component.css",
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
