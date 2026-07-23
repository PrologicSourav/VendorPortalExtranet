import { TestBed } from "@angular/core/testing";
import * as ExcelJS from "exceljs";
import {
  CatalogueExcelRow,
  CatalogueExcelService,
  MAX_FILE_SIZE_BYTES,
} from "./catalogue-excel.service";

const COLUMN_ORDER = [
  "itemCode",
  "description",
  "packUom",
  "price",
  "currency",
  "validFrom",
  "validTo",
  "taxClass",
] as const;

const VALID_ROW: Record<(typeof COLUMN_ORDER)[number], string | number> = {
  itemCode: "FOOD-001",
  description: "Basmati Rice 25kg",
  packUom: "25kg",
  price: 2800,
  currency: "INR",
  validFrom: "2026-01-01",
  validTo: "2026-12-31",
  taxClass: "GST-5",
};

/** Builds a real .xlsx File in memory from an array of row objects (header row auto-added). */
async function buildXlsxFile(
  rows: Record<string, string | number>[],
  filename = "upload.xlsx",
): Promise<File> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Catalogue");
  sheet.addRow(COLUMN_ORDER as unknown as string[]); // header
  for (const row of rows) {
    sheet.addRow(COLUMN_ORDER.map((k) => row[k]));
  }
  const buffer = await workbook.xlsx.writeBuffer();
  return new File([buffer], filename, {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

function errorsFor(rows: CatalogueExcelRow[], itemCode: string): string[] {
  return rows.find((r) => r.itemCode === itemCode)?.errors ?? [];
}

describe("CatalogueExcelService", () => {
  let service: CatalogueExcelService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CatalogueExcelService);
  });

  describe("validateFile", () => {
    it("rejects a non-.xlsx file", () => {
      const file = new File(["data"], "catalogue.csv", { type: "text/csv" });
      expect(service.validateFile(file)).toBe(
        "excelUpload.errorInvalidFileType",
      );
    });

    it("rejects an empty file", () => {
      const file = new File([], "catalogue.xlsx");
      expect(service.validateFile(file)).toBe("excelUpload.errorEmptyFile");
    });

    it("rejects a file over the 5MB size limit", () => {
      const big = new Uint8Array(MAX_FILE_SIZE_BYTES + 1);
      const file = new File([big], "catalogue.xlsx");
      expect(service.validateFile(file)).toBe(
        "excelUpload.errorFileTooLarge",
      );
    });

    it("accepts a reasonably-sized .xlsx file", () => {
      const file = new File(["data"], "catalogue.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      expect(service.validateFile(file)).toBeNull();
    });
  });

  describe("parseAndValidate", () => {
    it("parses a fully valid row with no errors", async () => {
      const file = await buildXlsxFile([VALID_ROW]);
      const result = await service.parseAndValidate(file);

      expect(result.validCount).toBe(1);
      expect(result.invalidCount).toBe(0);
      expect(result.rows[0].valid).toBeTrue();
      expect(result.rows[0].itemCode).toBe("FOOD-001");
      expect(result.rows[0].price).toBe(2800);
    });

    it("flags a missing required field (Item Code)", async () => {
      const file = await buildXlsxFile([{ ...VALID_ROW, itemCode: "" }]);
      const result = await service.parseAndValidate(file);

      expect(result.invalidCount).toBe(1);
      expect(result.rows[0].errors).toContain(
        "excelUpload.rowErrorItemCodeRequired",
      );
    });

    it("flags a non-alphanumeric Item Code", async () => {
      const file = await buildXlsxFile([
        { ...VALID_ROW, itemCode: "FOOD 001!" },
      ]);
      const result = await service.parseAndValidate(file);
      expect(errorsFor(result.rows, "FOOD 001!")).toContain(
        "excelUpload.rowErrorItemCodeAlphanumeric",
      );
    });

    it("flags a description over 255 characters", async () => {
      const longDesc = "x".repeat(256);
      const file = await buildXlsxFile([
        { ...VALID_ROW, description: longDesc },
      ]);
      const result = await service.parseAndValidate(file);
      expect(result.rows[0].errors).toContain(
        "excelUpload.rowErrorDescriptionTooLong",
      );
    });

    it("flags a zero or negative price", async () => {
      const file = await buildXlsxFile([{ ...VALID_ROW, price: 0 }]);
      const result = await service.parseAndValidate(file);
      expect(result.rows[0].errors).toContain(
        "excelUpload.rowErrorPriceInvalid",
      );
    });

    it("flags a price with more than 2 decimal places", async () => {
      const file = await buildXlsxFile([{ ...VALID_ROW, price: 12.345 }]);
      const result = await service.parseAndValidate(file);
      expect(result.rows[0].errors).toContain(
        "excelUpload.rowErrorPriceDecimalPlaces",
      );
    });

    it("flags a currency the app doesn't support", async () => {
      const file = await buildXlsxFile([{ ...VALID_ROW, currency: "USD" }]);
      const result = await service.parseAndValidate(file);
      expect(result.rows[0].errors).toContain(
        "excelUpload.rowErrorCurrencyUnsupported",
      );
    });

    it("accepts currency case-insensitively", async () => {
      const file = await buildXlsxFile([{ ...VALID_ROW, currency: "inr" }]);
      const result = await service.parseAndValidate(file);
      expect(result.rows[0].valid).toBeTrue();
      expect(result.rows[0].currency).toBe("INR");
    });

    it("flags a tax class the app doesn't support", async () => {
      const file = await buildXlsxFile([{ ...VALID_ROW, taxClass: "VAT-20" }]);
      const result = await service.parseAndValidate(file);
      expect(result.rows[0].errors).toContain(
        "excelUpload.rowErrorTaxClassUnsupported",
      );
    });

    it("flags validFrom after validTo", async () => {
      const file = await buildXlsxFile([
        { ...VALID_ROW, validFrom: "2026-12-31", validTo: "2026-01-01" },
      ]);
      const result = await service.parseAndValidate(file);
      expect(result.rows[0].errors).toContain(
        "excelUpload.rowErrorDateRange",
      );
    });

    it("accepts validFrom equal to validTo", async () => {
      const file = await buildXlsxFile([
        { ...VALID_ROW, validFrom: "2026-06-15", validTo: "2026-06-15" },
      ]);
      const result = await service.parseAndValidate(file);
      expect(result.rows[0].errors).not.toContain(
        "excelUpload.rowErrorDateRange",
      );
    });

    it("processes multiple rows independently (mixed valid/invalid)", async () => {
      const file = await buildXlsxFile([
        VALID_ROW,
        { ...VALID_ROW, itemCode: "FOOD-002", price: -5 },
        { ...VALID_ROW, itemCode: "FOOD-003", description: "" },
      ]);
      const result = await service.parseAndValidate(file);

      expect(result.rows.length).toBe(3);
      expect(result.validCount).toBe(1);
      expect(result.invalidCount).toBe(2);
    });

    it("skips fully blank trailing rows without erroring", async () => {
      const file = await buildXlsxFile([
        VALID_ROW,
        { itemCode: "", description: "", packUom: "", price: "", currency: "", validFrom: "", validTo: "", taxClass: "" },
      ]);
      const result = await service.parseAndValidate(file);
      expect(result.rows.length).toBe(1);
    });

    it("rejects a file with no data rows (header only)", async () => {
      const file = await buildXlsxFile([]);
      await expectAsync(service.parseAndValidate(file)).toBeRejectedWithError(
        "excelUpload.errorEmptyFile",
      );
    });

    it("rejects more than 1000 data rows", async () => {
      const rows = Array.from({ length: 1001 }, (_, i) => ({
        ...VALID_ROW,
        itemCode: `FOOD-${i}`,
      }));
      const file = await buildXlsxFile(rows);
      await expectAsync(service.parseAndValidate(file)).toBeRejectedWithError(
        "excelUpload.errorTooManyRows",
      );
    }, 15000);

    it("rejects a corrupt/non-Excel file gracefully", async () => {
      const file = new File(["not a real xlsx file"], "bad.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      await expectAsync(service.parseAndValidate(file)).toBeRejectedWithError(
        "excelUpload.errorCorruptFile",
      );
    });

    it("flags an item code that duplicates another row in the same file", async () => {
      const file = await buildXlsxFile([
        VALID_ROW,
        { ...VALID_ROW, description: "Duplicate of FOOD-001" },
      ]);
      const result = await service.parseAndValidate(file);
      // First occurrence is valid, second is flagged as duplicate.
      expect(result.rows[0].valid).toBeTrue();
      expect(result.rows[1].valid).toBeFalse();
      expect(result.rows[1].errors).toContain(
        "excelUpload.rowErrorItemCodeDuplicate",
      );
    });

    it("flags an item code that already exists in the catalogue (case-insensitive)", async () => {
      const file = await buildXlsxFile([VALID_ROW]);
      const result = await service.parseAndValidate(file, ["food-001"]);
      expect(result.rows[0].valid).toBeFalse();
      expect(result.rows[0].errors).toContain(
        "excelUpload.rowErrorItemCodeDuplicate",
      );
    });

    it("does not flag distinct item codes against existing ones", async () => {
      const file = await buildXlsxFile([{ ...VALID_ROW, itemCode: "FOOD-999" }]);
      const result = await service.parseAndValidate(file, ["FOOD-001"]);
      expect(result.rows[0].valid).toBeTrue();
      expect(result.rows[0].errors).not.toContain(
        "excelUpload.rowErrorItemCodeDuplicate",
      );
    });
  });

  describe("buildErrorReportCsv", () => {
    it("includes only invalid rows in the CSV", async () => {
      const rows: CatalogueExcelRow[] = [
        {
          rowNumber: 2,
          itemCode: "OK-1",
          description: "Fine",
          packUom: "kg",
          price: 10,
          currency: "INR",
          validFrom: "2026-01-01",
          validTo: "2026-12-31",
          taxClass: "GST-5",
          valid: true,
          errors: [],
        },
        {
          rowNumber: 3,
          itemCode: "BAD-1",
          description: "Broken",
          packUom: "",
          price: -1,
          currency: "XXX",
          validFrom: "",
          validTo: "",
          taxClass: "",
          valid: false,
          errors: ["excelUpload.rowErrorPackUomRequired"],
        },
      ];

      const blob = service.buildErrorReportCsv(rows);
      const text = await blob.text();

      expect(text).toContain("BAD-1");
      expect(text).not.toContain("OK-1");
    });
  });

  describe("buildTemplate", () => {
    it("produces a downloadable .xlsx that round-trips through parseAndValidate as valid", async () => {
      const blob = await service.buildTemplate();
      expect(blob.size).toBeGreaterThan(0);

      const file = new File([blob], "template.xlsx", { type: blob.type });
      const result = await service.parseAndValidate(file);

      expect(result.validCount).toBe(1);
      expect(result.invalidCount).toBe(0);
    });
  });
});
