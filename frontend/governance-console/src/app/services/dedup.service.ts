import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../environments/environment";

/** Item as returned inside a dedup candidate (subset of the backend Item entity). */
export interface DedupItem {
  id: string;
  itemCode: string;
  description: string;
  category: string;
  baseUom: string;
  packSize?: string | null;
  keySpecs?: string | null;
}

export interface ItemDedupCandidate {
  id: string;
  itemId: string;
  similarityScore: number;
  /** JSON array string, e.g. '["Description","Category","UOM"]'. */
  matchedAttributes?: string | null;
  isSource: boolean;
  item: DedupItem;
}

export interface ItemDedupCluster {
  id: string;
  status: string; // "Open" | "Merged" | "Dismissed" (JsonStringEnumConverter)
  modelVersion?: string | null;
  createdAt: string;
  resolvedAt?: string | null;
  mergedIntoItemId?: string | null;
  candidates: ItemDedupCandidate[];
}

/** Vendor as returned inside a vendor dedup candidate. */
export interface DedupVendor {
  id: string;
  legalName: string;
  tradingName?: string | null;
  gstin?: string | null;
  city?: string | null;
  state?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
}

export interface VendorDedupCandidate {
  id: string;
  vendorId: string;
  similarityScore: number;
  matchedAttributes?: string | null;
  isSource: boolean;
  vendor: DedupVendor;
}

export interface VendorDedupCluster {
  id: string;
  status: string; // "Open" | "Merged" | "Dismissed"
  createdAt: string;
  resolvedAt?: string | null;
  mergedIntoVendorId?: string | null;
  candidates: VendorDedupCandidate[];
}

@Injectable({ providedIn: "root" })
export class DedupService {
  private readonly base = `${environment.apiUrl}/dedup/item`;
  private readonly vendorBase = `${environment.apiUrl}/dedup/vendor`;

  constructor(private http: HttpClient) {}

  // ─── Vendor dedup ────────────────────────────────────────
  getVendorClusters(status?: string): Observable<VendorDedupCluster[]> {
    let params = new HttpParams();
    if (status) params = params.set("status", status);
    return this.http.get<VendorDedupCluster[]>(this.vendorBase, { params });
  }

  mergeVendor(
    clusterId: string,
    survivingVendorId: string,
    reason?: string,
  ): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(
      `${this.vendorBase}/${clusterId}/merge`,
      { survivingVendorId, reason },
    );
  }

  dismissVendor(clusterId: string): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(
      `${this.vendorBase}/${clusterId}/dismiss`,
      {},
    );
  }

  /** Fetch item dedup clusters, optionally filtered by status. */
  getItemClusters(status?: string): Observable<ItemDedupCluster[]> {
    let params = new HttpParams();
    if (status) params = params.set("status", status);
    return this.http.get<ItemDedupCluster[]>(this.base, { params });
  }

  /** Merge a cluster into the surviving (master) item. */
  merge(
    clusterId: string,
    survivingItemId: string,
    reason?: string,
  ): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(
      `${this.base}/${clusterId}/merge`,
      { survivingItemId, reason },
    );
  }

  /** Dismiss a cluster as "not a duplicate". */
  dismiss(clusterId: string): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(
      `${this.base}/${clusterId}/dismiss`,
      {},
    );
  }
}
