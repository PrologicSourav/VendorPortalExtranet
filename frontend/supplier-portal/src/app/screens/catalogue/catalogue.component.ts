import { Component, inject, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { TranslatePipe, TranslateService } from "@ngx-translate/core";
import { of, switchMap, Subject, debounceTime, distinctUntilChanged } from "rxjs";
import {
  ExcelUploadModalComponent,
  ExcelUploadRow,
} from "../../components/excel-upload-modal/excel-upload-modal.component";
import { MoneyPipe } from "../../pipes/money.pipe";
import {
  normalizeForMatch,
  descriptionSimilarity,
  DESCRIPTION_SIMILARITY_THRESHOLD,
} from "../../utils/text-similarity";
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
  imports: [
    CommonModule,
    FormsModule,
    TranslatePipe,
    ExcelUploadModalComponent,
    MoneyPipe,
  ],
  templateUrl: "./catalogue.component.html",
  styleUrl: "./catalogue.component.css",
})
export class CatalogueComponent implements OnInit {
  private excelService = inject(CatalogueExcelService);
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private translate = inject(TranslateService);

  searchTerm = "";
  showAddDialog = false;
  editingLine: any = null;

  showUploadModal = false;
  uploadColumns = CATALOGUE_UPLOAD_COLUMNS;

  /** Every catalogue this vendor owns, across all statuses (newest first). */
  catalogues: any[] = [];
  /** Which status the user is currently viewing (drives the toolbar dropdown). */
  viewStatus = "Draft";

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

  /** Only a Draft catalogue is editable — Submitted/Approved/Rejected are read-only views. */
  get isEditable(): boolean {
    return this.catalogueStatus === "Draft";
  }

  /** Status options offered in the view switcher. Draft is always available (it's the
   *  editable workspace, even before one exists); the rest appear only if the vendor
   *  actually has a catalogue in that state. Ordered by lifecycle. */
  get availableViews(): string[] {
    const present = new Set(this.catalogues.map((c) => c.status));
    return ["Draft", "Submitted", "Approved", "Rejected"].filter(
      (s) => s === "Draft" || present.has(s),
    );
  }

  /** Badge colour for the current catalogue status. */
  get statusBadgeClass(): string {
    switch (this.catalogueStatus) {
      case "Approved":
        return "badge-success";
      case "Rejected":
        return "badge-error";
      case "Submitted":
        return "badge-info";
      default:
        return "badge-warning"; // Draft
    }
  }

  readonly maxDescriptionLength = MAX_DESCRIPTION_LENGTH;

  /** True when the current item code matches the allowed format (letters, digits, dashes). */
  get isItemCodeValid(): boolean {
    return ITEM_CODE_PATTERN.test(this.formData.itemCode);
  }

  /** True when the current item code already exists on another line (case-insensitive).
   *  Editing a line against its own code is fine — only collisions with *other* lines count. */
  get isItemCodeDuplicate(): boolean {
    const code = this.formData.itemCode.trim().toLowerCase();
    if (!code) return false;
    return this.lines.some(
      (l) => l !== this.editingLine && (l.itemCode ?? "").trim().toLowerCase() === code,
    );
  }

  /** True when the current description matches another line after normalization
   *  (case/space/punctuation-insensitive) — e.g. "Basmati Rice 25kg" vs
   *  "basmati rice 25 kg". Treated as a hard duplicate. */
  get isDescriptionDuplicate(): boolean {
    const desc = normalizeForMatch(this.formData.description);
    if (!desc) return false;
    return this.lines.some(
      (l) => l !== this.editingLine && normalizeForMatch(l.description) === desc,
    );
  }

  /** The closest existing description that is *similar but not identical* to the
   *  current one (fuzzy bigram match) — used to warn about a probable duplicate
   *  like "Premium Basmati Rice 25kg" vs "Basmati Rice 25kg". Null if none. */
  get similarDescription(): string | null {
    const desc = normalizeForMatch(this.formData.description);
    if (desc.length < 3 || this.isDescriptionDuplicate) return null;
    let best: { text: string; score: number } | null = null;
    for (const l of this.lines) {
      if (l === this.editingLine) continue;
      const score = descriptionSimilarity(this.formData.description, l.description);
      if (
        score >= DESCRIPTION_SIMILARITY_THRESHOLD &&
        (!best || score > best.score)
      ) {
        best = { text: l.description, score };
      }
    }
    return best?.text ?? null;
  }

  validateExcelFile = (file: File) => this.excelService.validateFile(file);
  parseExcelFile = (file: File) =>
    this.excelService.parseAndValidate(
      file,
      this.lines.map((l) => l.itemCode ?? ""),
      this.lines.map((l) => l.description ?? ""),
    );
  downloadExcelTemplate = () => this.excelService.buildTemplate();
  buildExcelErrorReport = (rows: ExcelUploadRow[]) =>
    this.excelService.buildErrorReportCsv(
      rows as unknown as CatalogueExcelRow[],
    );

  formData: any = this.emptyForm();

  /** Item-mapping picker state (maps a line to a Web Prol'IFIC master item). */
  itemSearchTerm = "";
  itemResults: any[] = [];
  searchingItems = false;
  private itemSearch$ = new Subject<string>();

  private emptyForm() {
    return {
      itemId: null as string | null,
      mappedItemCode: null as string | null,
      mappedItemDescription: null as string | null,
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

  lines: any[] = [];

  ngOnInit(): void {
    // Debounced master-item search for the line-mapping picker.
    this.itemSearch$
      .pipe(debounceTime(250), distinctUntilChanged())
      .subscribe((term) => this.runItemSearch(term));

    const vendorId = this.auth.user()?.vendorId;
    if (!vendorId) {
      // No vendor context (e.g. internal staff account) — not a load failure.
      // The template's no-vendor notice explains it; don't also flag loadError.
      this.loading = false;
      return;
    }
    // Load every catalogue this vendor owns (all statuses) so approved/submitted
    // price lists remain visible, not just the editable Draft.
    this.api.getCatalogues(vendorId).subscribe({
      next: (catalogues: any[]) => {
        this.catalogues = catalogues ?? [];
        this.initView();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.loadError = true;
      },
    });
  }

  /** Pick the default view: the editable Draft if one exists, otherwise the most
   *  recently active catalogue (so an approved price list shows instead of an empty page). */
  private initView(): void {
    const hasDraft = this.catalogues.some((c) => c.status === "Draft");
    const fallback = this.mostRecent(this.catalogues)?.status ?? "Draft";
    this.selectView(hasDraft ? "Draft" : fallback);
  }

  /** The most recently *active* catalogue in a set — the one whose latest lifecycle
   *  event (approved > submitted > updated > created) is newest. Used so a vendor
   *  with several catalogues at one status sees the current one (e.g. the price list
   *  approved most recently, not just the one created most recently). */
  private mostRecent(list: any[]): any | null {
    const ts = (c: any) =>
      new Date(c.approvedDate ?? c.submittedDate ?? c.updatedAt ?? c.createdAt ?? 0).getTime();
    return list.reduce(
      (best, c) => (best === null || ts(c) > ts(best) ? c : best),
      null as any,
    );
  }

  /** Switch which catalogue (by status) is shown. Draft with no persisted catalogue
   *  yet becomes an empty, editable workspace. */
  selectView(status: string): void {
    this.viewStatus = status;
    const cat = this.mostRecent(this.catalogues.filter((c) => c.status === status));
    this.catalogueId = cat?.id ?? null;
    this.catalogueStatus = status;
    this.lines = (cat?.lines ?? []).map((l: any) => this.mapServerLine(l));
  }

  /** Reload all catalogues from the server and re-show the given status view. Used
   *  after mutations so the in-memory state stays consistent with the backend. */
  private refresh(status: string): void {
    const vendorId = this.auth.user()?.vendorId;
    if (!vendorId) return;
    this.api.getCatalogues(vendorId).subscribe({
      next: (catalogues: any[]) => {
        this.catalogues = catalogues ?? [];
        const present = this.catalogues.some((c) => c.status === status);
        this.selectView(
          present || status === "Draft"
            ? status
            : (this.mostRecent(this.catalogues)?.status ?? "Draft"),
        );
      },
    });
  }

  get filteredLines() {
    return this.lines.filter(
      (l) =>
        !this.searchTerm ||
        l.description.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        l.itemCode.toLowerCase().includes(this.searchTerm.toLowerCase()),
    );
  }

  openAddDialog(): void {
    this.editingLine = null;
    this.saveError = null;
    this.formData = this.emptyForm();
    this.resetItemSearch();
    this.showAddDialog = true;
  }

  editLine(line: any) {
    this.editingLine = line;
    this.formData = { ...this.emptyForm(), ...line };
    this.saveError = null;
    this.resetItemSearch();
    this.showAddDialog = true;
  }

  deleteLine(line: any) {
    // A line that hasn't been persisted yet (no id) is just dropped from the view.
    if (!line.id || !this.catalogueId) {
      this.lines = this.lines.filter((l) => l !== line);
      return;
    }
    this.api.deleteCatalogueLine(this.catalogueId, line.id).subscribe({
      next: () => {
        this.lines = this.lines.filter((l) => l !== line);
        this.showToast("success", "catalogue.toastLineDeleted");
        this.refresh("Draft");
      },
      error: (err) => {
        this.showToast("error", undefined, undefined, this.extractErrorMessage(err));
      },
    });
  }

  // ─── Item mapping (link a line to a Web Prol'IFIC master item) ───────────
  /** Fired on every keystroke in the mapping search box; feeds the debounced stream. */
  onItemSearchInput(term: string): void {
    this.itemSearchTerm = term;
    this.itemSearch$.next(term.trim());
  }

  /** Pre-fill the picker from the line's description to suggest likely matches. */
  suggestItemMatches(): void {
    const seed = (this.formData.description || "").trim();
    this.itemSearchTerm = seed;
    this.runItemSearch(seed);
  }

  private runItemSearch(term: string): void {
    if (!term) {
      this.itemResults = [];
      this.searchingItems = false;
      return;
    }
    this.searchingItems = true;
    this.api.searchItems(term).subscribe({
      next: (items: any[]) => {
        this.itemResults = items ?? [];
        this.searchingItems = false;
      },
      error: () => {
        this.itemResults = [];
        this.searchingItems = false;
      },
    });
  }

  selectMappedItem(item: any): void {
    this.formData.itemId = item.id;
    this.formData.mappedItemCode = item.itemCode;
    this.formData.mappedItemDescription = item.description;
    this.itemResults = [];
    this.itemSearchTerm = "";
  }

  clearMappedItem(): void {
    this.formData.itemId = null;
    this.formData.mappedItemCode = null;
    this.formData.mappedItemDescription = null;
  }

  private resetItemSearch(): void {
    this.itemSearchTerm = "";
    this.itemResults = [];
    this.searchingItems = false;
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
          this.refresh("Draft");
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
          this.refresh("Draft");
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
        this.submitting = false;
        this.showToast("success", "catalogue.toastSubmitted");
        // The Draft is now Submitted — reload and switch to the Submitted view so
        // the just-submitted list stays visible (read-only) instead of vanishing.
        this.refresh("Submitted");
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
      // Mapping to a Web Prol'IFIC master item (line.item is the included navigation).
      itemId: line.itemId ?? null,
      mappedItemCode: line.item?.itemCode ?? null,
      mappedItemDescription: line.item?.description ?? null,
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
    this.formData = this.emptyForm();
    this.resetItemSearch();
  }

  private showToast(type: string, key?: string, params?: any, text?: string): void {
    this.toast = { type, key, params, text };
    setTimeout(() => (this.toast = null), 4000);
  }
}
