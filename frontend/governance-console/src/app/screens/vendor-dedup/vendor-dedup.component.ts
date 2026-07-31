import { Component, OnInit, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { HttpErrorResponse } from "@angular/common/http";
import {
  DedupService,
  VendorDedupCluster,
  VendorDedupCandidate,
} from "../../services/dedup.service";

@Component({
  selector: "app-vendor-dedup",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header">
      <h1>Vendor Deduplication</h1>
      <p class="page-subtitle">
        Review clusters of potential duplicate vendors across entities
      </p>
    </div>

    <!-- Auth required -->
    <div *ngIf="authError" class="card" style="margin-top: 16px">
      <div class="empty-state">
        <div class="empty-icon">🔒</div>
        <div class="empty-title">Authentication required</div>
        <div class="empty-desc">
          This console must be opened from the host application with a valid
          governance session. No internal access token was provided.
        </div>
      </div>
    </div>

    <div *ngIf="loading" class="card" style="margin-top: 16px">
      <div class="empty-state">
        <div class="empty-icon">⏳</div>
        <div class="empty-title">Loading clusters…</div>
      </div>
    </div>

    <div *ngIf="loadError && !authError" class="card" style="margin-top: 16px">
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <div class="empty-title">Could not load clusters</div>
        <div class="empty-desc">{{ loadError }}</div>
        <button class="btn btn-secondary" style="margin-top: 12px" (click)="load()">
          Retry
        </button>
      </div>
    </div>

    <ng-container *ngIf="!loading && !authError && !loadError">
      <div
        *ngFor="let cluster of clusters"
        class="cluster-card card"
        style="margin-top: 16px"
      >
        <div class="card-header">
          {{ clusterTitle(cluster) }} — Similarity:
          {{ topSimilarity(cluster) | number: "1.0-0" }}%
          <span class="badge badge-warning" style="margin-left: 8px">{{
            cluster.status
          }}</span>
        </div>
        <div class="card-body">
          <div class="vendor-comparison">
            <div
              *ngFor="let c of cluster.candidates"
              class="vendor-card"
              [class.primary]="c.isSource"
            >
              <div class="vendor-header">
                <strong>{{ c.vendor.legalName }}</strong>
                <span *ngIf="c.isSource" class="badge badge-success">Primary</span>
              </div>
              <div class="vendor-detail">
                GSTIN: <code>{{ c.vendor.gstin || "—" }}</code>
              </div>
              <div class="vendor-detail">City: {{ c.vendor.city || "—" }}</div>
              <div class="vendor-detail">
                Contact: {{ c.vendor.contactEmail || c.vendor.contactPhone || "—" }}
              </div>
              <div class="vendor-detail attrs">
                <span
                  *ngFor="let a of matchedAttributes(c)"
                  class="attr-chip"
                  >{{ a }}</span
                >
                <span class="score">{{ c.similarityScore | number: "1.0-0" }}%</span>
              </div>
            </div>
          </div>
          <div class="cluster-actions">
            <button
              class="btn btn-primary"
              [disabled]="busyId === cluster.id"
              (click)="merge(cluster)"
            >
              🔗 Merge into Primary
            </button>
            <button
              class="btn btn-secondary"
              [disabled]="busyId === cluster.id"
              (click)="dismiss(cluster)"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>

      <div *ngIf="clusters.length === 0" class="card" style="margin-top: 16px">
        <div class="empty-state">
          <div class="empty-icon">🏢</div>
          <div class="empty-title">No open clusters</div>
          <div class="empty-desc">
            All vendor deduplication clusters have been reviewed.
          </div>
        </div>
      </div>
    </ng-container>

    <div *ngIf="toast" class="toast" [ngClass]="'toast-' + toast.type">
      {{ toast.message }}
    </div>
  `,
  styles: [
    `
      .page-header {
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
      .vendor-comparison {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }
      .vendor-card {
        padding: 16px;
        border: 1px solid var(--color-border);
        border-radius: 8px;
        &.primary {
          border-color: var(--color-primary);
          background: var(--color-surface-active, #f0f4ff);
        }
      }
      .vendor-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
        font-size: 14px;
      }
      .vendor-detail {
        font-size: 12px;
        color: var(--color-text-secondary);
        padding: 2px 0;
      }
      .vendor-detail.attrs {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        align-items: center;
        margin-top: 6px;
      }
      .attr-chip {
        font-size: 11px;
        background: var(--color-surface-alt);
        color: var(--color-text-secondary);
        padding: 1px 6px;
        border-radius: 10px;
      }
      .score {
        margin-left: auto;
        font-weight: 600;
        font-size: 12px;
      }
      code {
        background: var(--color-surface-alt);
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 11px;
      }
      .cluster-actions {
        display: flex;
        gap: 10px;
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid var(--color-border-light);
      }
    `,
  ],
})
export class VendorDedupComponent implements OnInit {
  private dedup = inject(DedupService);

  clusters: VendorDedupCluster[] = [];
  loading = false;
  authError = false;
  loadError: string | null = null;
  busyId: string | null = null;
  toast: { type: string; message: string } | null = null;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.authError = false;
    this.loadError = null;
    this.dedup.getVendorClusters("Open").subscribe({
      next: (all) => {
        this.clusters = all.filter((c) => c.status === "Open");
        this.loading = false;
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        if (err.status === 401 || err.status === 403) this.authError = true;
        else this.loadError = this.extractError(err);
      },
    });
  }

  clusterTitle(cluster: VendorDedupCluster): string {
    const source = cluster.candidates.find((c) => c.isSource);
    return (source ?? cluster.candidates[0])?.vendor.legalName ?? "Cluster";
  }

  topSimilarity(cluster: VendorDedupCluster): number {
    return cluster.candidates.reduce(
      (max, c) => Math.max(max, c.similarityScore),
      0,
    );
  }

  matchedAttributes(candidate: VendorDedupCandidate): string[] {
    if (!candidate.matchedAttributes) return [];
    try {
      const parsed = JSON.parse(candidate.matchedAttributes);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }

  merge(cluster: VendorDedupCluster): void {
    const source =
      cluster.candidates.find((c) => c.isSource) ?? cluster.candidates[0];
    if (!source) {
      this.showToast("error", "Cluster has no vendors to merge.");
      return;
    }
    this.busyId = cluster.id;
    this.dedup.mergeVendor(cluster.id, source.vendorId).subscribe({
      next: (res) => {
        this.removeCluster(cluster);
        this.showToast("success", res?.message ?? "Vendor merge completed.");
      },
      error: (err: HttpErrorResponse) => {
        this.busyId = null;
        this.showToast("error", this.extractError(err));
      },
    });
  }

  dismiss(cluster: VendorDedupCluster): void {
    this.busyId = cluster.id;
    this.dedup.dismissVendor(cluster.id).subscribe({
      next: (res) => {
        this.removeCluster(cluster);
        this.showToast("success", res?.message ?? "Cluster dismissed.");
      },
      error: (err: HttpErrorResponse) => {
        this.busyId = null;
        this.showToast("error", this.extractError(err));
      },
    });
  }

  private removeCluster(cluster: VendorDedupCluster): void {
    this.clusters = this.clusters.filter((c) => c.id !== cluster.id);
    this.busyId = null;
  }

  private extractError(err: HttpErrorResponse): string {
    const e = err?.error;
    if (typeof e === "string" && e) return e;
    return (
      e?.error?.message ??
      e?.message ??
      e?.error ??
      err?.message ??
      "Something went wrong. Please try again."
    );
  }

  private showToast(type: string, message: string): void {
    this.toast = { type, message };
    setTimeout(() => (this.toast = null), 3000);
  }
}
