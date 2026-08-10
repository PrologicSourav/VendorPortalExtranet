import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../environments/environment";

/** Minimal shape of a paginated list response from the API. */
export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface GovVendor {
  id: string;
  legalName: string;
  tradingName?: string | null;
  gstin?: string | null;
  pan?: string | null;
  city?: string | null;
  state?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  kycStatus: string;
  status: string;
  isMsme?: boolean | null;
  createdAt: string;
}

export interface CatalogueReviewLine {
  itemCode: string;
  description: string;
  packUom: string;
  price: number;
  currency: string;
  contractPrice?: number | null;
  deviationPercent?: number | null;
  mappedItemId?: string | null;
  mappedItemCode?: string | null;
  mappedItemDescription?: string | null;
}

export interface CatalogueReview {
  id: string;
  vendorId: string;
  supplierName: string;
  versionLabel: string;
  status: string;
  submittedDate?: string | null;
  lineCount: number;
  lines: CatalogueReviewLine[];
}

export interface PurchaseOrderSummary {
  id: string;
  poNumber: string;
  vendorName?: string | null;
  propertyName?: string | null;
  orderDate: string;
  status: string;
  totalValue: number;
  transactionCurrencyCode: string;
  hasPrintedDocument: boolean;
  printedDocumentFileName?: string | null;
  printedDocumentUploadedAt?: string | null;
}

export interface KycChangeRequest {
  id: string;
  vendorId: string;
  fieldChanged: string;
  oldValue?: string | null;
  newValue?: string | null;
  maker?: string | null;
  checker?: string | null;
  status: string;
  requestedAt: string;
  decidedAt?: string | null;
}

/**
 * Read/action calls the governance console makes against the internal API.
 * The host-supplied JWT is attached by the shared auth interceptor.
 */
@Injectable({ providedIn: "root" })
export class GovApiService {
  private readonly api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ─── KYC review ──────────────────────────────────────────
  getKycQueue(status?: string, search?: string): Observable<PagedResult<GovVendor>> {
    let params = new HttpParams();
    if (status) params = params.set("status", status);
    if (search) params = params.set("search", search);
    return this.http.get<PagedResult<GovVendor>>(`${this.api}/kyc/queue`, { params });
  }

  validateKyc(vendorId: string): Observable<unknown> {
    return this.http.put(`${this.api}/kyc/vendor/${vendorId}/validate`, {});
  }

  blockKyc(vendorId: string, reason?: string): Observable<unknown> {
    return this.http.put(`${this.api}/kyc/vendor/${vendorId}/block`, { reason });
  }

  // ─── Maker-checker (KYC change approvals) ────────────────
  getPendingChangeRequests(): Observable<KycChangeRequest[]> {
    return this.http.get<KycChangeRequest[]>(`${this.api}/makerchecker/pending`);
  }

  approveChangeRequest(id: string): Observable<unknown> {
    return this.http.put(`${this.api}/makerchecker/${id}/approve`, {});
  }

  rejectChangeRequest(id: string): Observable<unknown> {
    return this.http.put(`${this.api}/makerchecker/${id}/reject`, {});
  }

  // ─── Catalogue approvals ─────────────────────────────────
  getCataloguesForReview(status?: string): Observable<CatalogueReview[]> {
    let params = new HttpParams();
    if (status) params = params.set("status", status);
    return this.http.get<CatalogueReview[]>(`${this.api}/catalogues`, { params });
  }

  approveCatalogue(id: string): Observable<unknown> {
    return this.http.put(`${this.api}/catalogues/${id}/approve`, {});
  }

  rejectCatalogue(id: string, reason: string): Observable<unknown> {
    return this.http.put(`${this.api}/catalogues/${id}/reject`, { reason });
  }

  // ─── Purchase order documents ─────────────────────────────
  searchPurchaseOrders(search?: string): Observable<PagedResult<PurchaseOrderSummary>> {
    let params = new HttpParams();
    if (search) params = params.set("search", search);
    return this.http.get<PagedResult<PurchaseOrderSummary>>(`${this.api}/purchaseorders`, { params });
  }

  uploadPoDocument(poId: string, file: File): Observable<unknown> {
    const form = new FormData();
    form.append("file", file, file.name);
    return this.http.post(`${this.api}/purchaseorders/${poId}/document`, form);
  }

  // ─── Supplier accounts (vendor master) ───────────────────
  getVendors(status?: string, search?: string): Observable<PagedResult<GovVendor>> {
    let params = new HttpParams();
    if (status) params = params.set("status", status);
    if (search) params = params.set("search", search);
    return this.http.get<PagedResult<GovVendor>>(`${this.api}/vendors`, { params });
  }
}
