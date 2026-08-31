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

export interface DeliveryNoteSummary {
  id: string;
  deliveryNoteNumber: string;
  purchaseOrderId: string;
  poNumber?: string | null;
  vendorName?: string | null;
  expectedDeliveryDate: string;
  status: string;
  lineCount: number;
  createdAt: string;
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

  // ─── Delivery note receiving ─────────────────────────────
  searchDeliveryNotes(status?: string, search?: string): Observable<PagedResult<DeliveryNoteSummary>> {
    let params = new HttpParams();
    if (status) params = params.set("status", status);
    if (search) params = params.set("search", search);
    return this.http.get<PagedResult<DeliveryNoteSummary>>(`${this.api}/deliverynotes`, { params });
  }

  receiveDeliveryNote(id: string): Observable<unknown> {
    return this.http.put(`${this.api}/deliverynotes/${id}/receive`, {});
  }

  // ─── Supplier accounts (vendor master) ───────────────────
  getVendors(status?: string, search?: string): Observable<PagedResult<GovVendor>> {
    let params = new HttpParams();
    if (status) params = params.set("status", status);
    if (search) params = params.set("search", search);
    return this.http.get<PagedResult<GovVendor>>(`${this.api}/vendors`, { params });
  }

  // ─── Chains / Properties reference list ──────────────────
  getBuyingEntities(): Observable<BuyingEntityOption[]> {
    return this.http.get<BuyingEntityOption[]>(`${this.api}/buyingentities`);
  }

  // ─── Vendor creation (Flow B — brand new vendor) ─────────
  createVendor(legalName: string, gstin?: string | null): Observable<GovVendor> {
    return this.http.post<GovVendor>(`${this.api}/vendors`, {
      legalName,
      gstin: gstin || null,
    });
  }

  // ─── Vendor relationships (Chain/Property access) ────────
  getVendorRelationships(vendorId: string): Observable<VendorRelationship[]> {
    return this.http.get<VendorRelationship[]>(`${this.api}/vendorrelationships/vendor/${vendorId}`);
  }

  createVendorRelationship(body: {
    vendorId: string;
    buyingEntityId: string;
    propertyId?: string | null;
    scopeType: "Chain" | "Property";
    externalVendorId?: string | null;
  }): Observable<unknown> {
    return this.http.post(`${this.api}/vendorrelationships`, body);
  }

  setVendorRelationshipStatus(id: string, status: "Active" | "Inactive"): Observable<unknown> {
    return this.http.put(`${this.api}/vendorrelationships/${id}/status`, { status });
  }

  // ─── Unmapped WISH vendors ────────────────────────────────
  getUnmappedWishVendors(search?: string): Observable<UnmappedVendorsResult> {
    let params = new HttpParams();
    if (search) params = params.set("search", search);
    return this.http.get<UnmappedVendorsResult>(`${this.api}/vendorrelationships/unmapped`, { params });
  }

  // ─── Vendor access requests (Flow C approval queue) ──────
  getVendorRequestQueue(status?: string): Observable<VendorRequestQueueItem[]> {
    let params = new HttpParams();
    if (status) params = params.set("status", status);
    return this.http.get<VendorRequestQueueItem[]>(`${this.api}/vendorrequests`, { params });
  }

  approveVendorRequest(id: string, remarks?: string): Observable<unknown> {
    return this.http.put(`${this.api}/vendorrequests/${id}/approve`, { remarks });
  }

  rejectVendorRequest(id: string, remarks?: string): Observable<unknown> {
    return this.http.put(`${this.api}/vendorrequests/${id}/reject`, { remarks });
  }
}

export interface BuyingEntityOption {
  id: string;
  name: string;
  code?: string | null;
  properties: { id: string; name: string; code?: string | null; city?: string | null }[];
}

export interface VendorRelationship {
  id: string;
  buyingEntityId: string;
  buyingEntityName: string;
  propertyId?: string | null;
  propertyName?: string | null;
  scopeType: "Chain" | "Property";
  status: "Active" | "Inactive";
  externalVendorId?: string | null;
  startDate: string;
  endDate?: string | null;
}

export interface UnmappedVendorRow {
  vendorId: string;
  vendorName: string;
  wishPropertyId: string;
  gstin?: string | null;
  pan?: string | null;
  propertyName?: string | null;
  buyingEntityName?: string | null;
  propertyId?: string | null;
  buyingEntityId?: string | null;
  resolved: boolean;
}

export interface UnmappedVendorsResult {
  configured: boolean;
  items: UnmappedVendorRow[];
  totalCount: number;
}

export interface VendorRequestQueueItem {
  id: string;
  vendorId: string;
  vendorName: string;
  requestedBuyingEntityId: string;
  buyingEntityName: string;
  requestedPropertyId?: string | null;
  propertyName?: string | null;
  requestType: "Chain" | "Property";
  status: "Pending" | "Approved" | "Rejected" | "Cancelled";
  requestedDate: string;
  remarks?: string | null;
}
