import { Injectable } from "@angular/core";
// Type-only import: contributes zero runtime bytes to the main bundle.
// The real module is loaded on demand (see loadExcelJS()) so the ~320KB
// exceljs library only downloads when a user actually opens the upload modal.
import type * as ExcelJSTypes from "exceljs";

async function loadExcelJS(): Promise<typeof ExcelJSTypes> {
  // exceljs is CommonJS; Angular's production esbuild bundler wraps it as
  // { default: <the actual module.exports> } while the dev-server's Vite
  // bundler spreads named exports (Workbook, etc.) directly onto the
  // namespace object. Normalize both shapes so `.Workbook` always resolves.
  const mod = (await import("exceljs")) as unknown as
    | typeof ExcelJSTypes
    | { default: typeof ExcelJSTypes };
  return "default" in mod && mod.default ? mod.default : (mod as typeof ExcelJSTypes);
}

/** Column order matches the downloadable template exactly (A → H). */
const COLUMNS = [
  "itemCode",
  "description",
  "packUom",
  "price",
  "currency",
  "validFrom",
  "validTo",
  "taxClass",
] as const;

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
export const MAX_ROWS = 1000;
export const MAX_DESCRIPTION_LENGTH = 255;
export const SUPPORTED_CURRENCIES = ["INR", "AED"];
export const SUPPORTED_TAX_CLASSES = ["GST-0", "GST-5", "GST-12", "GST-18"];

export interface CatalogueExcelRow {
  rowNumber: number; // 1-based spreadsheet row, header is row 1
  itemCode: string;
  description: string;
  packUom: string;
  price: number;
  currency: string;
  validFrom: string;
  validTo: string;
  taxClass: string;
  valid: boolean;
  errors: string[];
  // Satisfies ExcelUploadRow's generic contract (excel-upload-modal.component.ts)
  // so this concrete row type can be passed anywhere that interface is expected.
  [key: string]: unknown;
}

export interface CatalogueExcelParseResult {
  rows: CatalogueExcelRow[];
  validCount: number;
  invalidCount: number;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function cellToString(value: ExcelJSTypes.CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object" && "text" in (value as any)) {
    return String((value as any).text ?? "").trim();
  }
  return String(value).trim();
}

function cellToDateString(value: ExcelJSTypes.CellValue): string {
  if (value instanceof Date) {
    // Normalize to YYYY-MM-DD using UTC parts to avoid timezone drift.
    const y = value.getUTCFullYear();
    const m = String(value.getUTCMonth() + 1).padStart(2, "0");
    const d = String(value.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return cellToString(value);
}

@Injectable({ providedIn: "root" })
export class CatalogueExcelService {
  /** Validates file type/size before any parsing is attempted. */
  validateFile(file: File): string | null {
    const isXlsx =
      file.name.toLowerCase().endsWith(".xlsx") &&
      (file.type === "" ||
        file.type ===
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    if (!isXlsx) {
      return "excelUpload.errorInvalidFileType";
    }
    if (file.size === 0) {
      return "excelUpload.errorEmptyFile";
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return "excelUpload.errorFileTooLarge";
    }
    return null;
  }

  /**
   * Parses and validates an .xlsx File, returning every data row with per-row errors.
   * @param existingItemCodes item codes already present in the catalogue — any row
   *        reusing one (or duplicating another row within the same file) is flagged.
   */
  async parseAndValidate(
    file: File,
    existingItemCodes: string[] = [],
  ): Promise<CatalogueExcelParseResult> {
    const buffer = await file.arrayBuffer();
    const ExcelJS = await loadExcelJS();
    const workbook = new ExcelJS.Workbook();

    try {
      await workbook.xlsx.load(buffer);
    } catch {
      throw new Error("excelUpload.errorCorruptFile");
    }

    const worksheet = workbook.worksheets[0];
    if (!worksheet || worksheet.rowCount <= 1) {
      throw new Error("excelUpload.errorEmptyFile");
    }

    const dataRowCount = worksheet.rowCount - 1;
    if (dataRowCount > MAX_ROWS) {
      throw new Error("excelUpload.errorTooManyRows");
    }

    const rows: CatalogueExcelRow[] = [];
    // Item codes are matched case-insensitively for duplicate detection.
    const existingCodes = new Set(
      existingItemCodes.map((c) => c.trim().toLowerCase()).filter(Boolean),
    );
    const seenInFile = new Set<string>();

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // header

      const raw: Record<string, string> = {};
      COLUMNS.forEach((key, i) => {
        const cell = row.getCell(i + 1);
        raw[key] =
          key === "validFrom" || key === "validTo"
            ? cellToDateString(cell.value)
            : cellToString(cell.value);
      });

      // A fully empty row (e.g. trailing blank rows in the sheet) is skipped silently.
      const isBlank = COLUMNS.every((key) => raw[key] === "");
      if (isBlank) return;

      const priceNum = Number(raw["price"]);
      const parsed: CatalogueExcelRow = {
        rowNumber,
        itemCode: raw["itemCode"],
        description: raw["description"],
        packUom: raw["packUom"],
        price: priceNum,
        currency: raw["currency"].toUpperCase(),
        validFrom: raw["validFrom"],
        validTo: raw["validTo"],
        taxClass: raw["taxClass"].toUpperCase(),
        valid: true,
        errors: [],
      };

      parsed.errors = this.validateRow(parsed, raw["price"]);

      // Duplicate item code — either already in the catalogue, or repeated in this file.
      const codeKey = parsed.itemCode.trim().toLowerCase();
      if (codeKey) {
        if (existingCodes.has(codeKey) || seenInFile.has(codeKey)) {
          parsed.errors.push("excelUpload.rowErrorItemCodeDuplicate");
        }
        seenInFile.add(codeKey);
      }

      parsed.valid = parsed.errors.length === 0;
      rows.push(parsed);
    });

    return {
      rows,
      validCount: rows.filter((r) => r.valid).length,
      invalidCount: rows.filter((r) => !r.valid).length,
    };
  }

  private validateRow(row: CatalogueExcelRow, rawPrice: string): string[] {
    const errors: string[] = [];

    if (!row.itemCode) {
      errors.push("excelUpload.rowErrorItemCodeRequired");
    } else if (!/^[a-zA-Z0-9-]+$/.test(row.itemCode)) {
      errors.push("excelUpload.rowErrorItemCodeAlphanumeric");
    }

    if (!row.description) {
      errors.push("excelUpload.rowErrorDescriptionRequired");
    } else if (row.description.length > MAX_DESCRIPTION_LENGTH) {
      errors.push("excelUpload.rowErrorDescriptionTooLong");
    }

    if (!row.packUom) {
      errors.push("excelUpload.rowErrorPackUomRequired");
    }

    if (!rawPrice) {
      errors.push("excelUpload.rowErrorPriceRequired");
    } else if (!Number.isFinite(row.price) || row.price <= 0) {
      errors.push("excelUpload.rowErrorPriceInvalid");
    } else if (!/^\d+(\.\d{1,2})?$/.test(String(row.price))) {
      errors.push("excelUpload.rowErrorPriceDecimalPlaces");
    }

    if (!row.currency) {
      errors.push("excelUpload.rowErrorCurrencyRequired");
    } else if (!SUPPORTED_CURRENCIES.includes(row.currency)) {
      errors.push("excelUpload.rowErrorCurrencyUnsupported");
    }

    if (!row.validFrom) {
      errors.push("excelUpload.rowErrorValidFromRequired");
    } else if (!DATE_RE.test(row.validFrom)) {
      errors.push("excelUpload.rowErrorDateFormat");
    }

    if (!row.validTo) {
      errors.push("excelUpload.rowErrorValidToRequired");
    } else if (!DATE_RE.test(row.validTo)) {
      errors.push("excelUpload.rowErrorDateFormat");
    }

    if (
      row.validFrom &&
      row.validTo &&
      DATE_RE.test(row.validFrom) &&
      DATE_RE.test(row.validTo) &&
      row.validFrom > row.validTo
    ) {
      errors.push("excelUpload.rowErrorDateRange");
    }

    if (!row.taxClass) {
      errors.push("excelUpload.rowErrorTaxClassRequired");
    } else if (!SUPPORTED_TAX_CLASSES.includes(row.taxClass)) {
      errors.push("excelUpload.rowErrorTaxClassUnsupported");
    }

    return errors;
  }

  /** Builds a downloadable .xlsx template with headers and one example row. */
  async buildTemplate(): Promise<Blob> {
    const ExcelJS = await loadExcelJS();
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Catalogue");

    sheet.columns = [
      { header: "Item Code", key: "itemCode", width: 16 },
      { header: "Description", key: "description", width: 32 },
      { header: "Pack UOM", key: "packUom", width: 14 },
      { header: "Price", key: "price", width: 12 },
      { header: "Currency", key: "currency", width: 12 },
      { header: "Validity From", key: "validFrom", width: 16 },
      { header: "Validity To", key: "validTo", width: 16 },
      { header: "Tax Class", key: "taxClass", width: 14 },
    ];
    sheet.getRow(1).font = { bold: true };

    sheet.addRow({
      itemCode: "FOOD-001",
      description: "Basmati Rice 25kg",
      packUom: "25kg",
      price: 2800,
      currency: "INR",
      validFrom: "2026-01-01",
      validTo: "2026-12-31",
      taxClass: "GST-5",
    });

    sheet.getCell("E2").note =
      `Supported currencies: ${SUPPORTED_CURRENCIES.join(", ")}`;
    sheet.getCell("H2").note =
      `Supported tax classes: ${SUPPORTED_TAX_CLASSES.join(", ")}`;
    sheet.getCell("F2").note = "Format: YYYY-MM-DD";
    sheet.getCell("G2").note = "Format: YYYY-MM-DD";

    const buffer = await workbook.xlsx.writeBuffer();
    return new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
  }

  /** Builds a CSV blob listing only the invalid rows and their reasons, for download. */
  buildErrorReportCsv(rows: CatalogueExcelRow[]): Blob {
    const invalid = rows.filter((r) => !r.valid);
    const header = "Row,Item Code,Description,Errors\n";
    const lines = invalid.map((r) => {
      const cells = [
        String(r.rowNumber),
        r.itemCode,
        r.description,
        r.errors.join("; "),
      ].map((v) => `"${v.replace(/"/g, '""')}"`);
      return cells.join(",");
    });
    return new Blob([header + lines.join("\n")], { type: "text/csv" });
  }
}
