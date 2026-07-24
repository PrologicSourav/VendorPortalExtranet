import { Component, OnInit, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { HttpErrorResponse } from "@angular/common/http";
import {
  DedupService,
  ItemDedupCluster,
  ItemDedupCandidate,
} from "../../services/dedup.service";

@Component({
  selector: "app-item-dedup",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-header">
      <h1>Item Deduplication</h1>
      <p class="page-subtitle">
        Manage duplicate item suggestions from the AI/ML pipeline{{
          modelVersion ? " · Model " + modelVersion : ""
        }}
      </p>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Open Suggestions</div>
        <div class="kpi-value">{{ openCount }}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Resolved This Month</div>
        <div class="kpi-value">{{ resolvedThisMonth }}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Last Model Run</div>
        <div class="kpi-value" style="font-size: 16px">
          {{
            lastModelRun
              ? (lastModelRun | date: "MMM d, y, HH:mm" : "UTC") + " UTC"
              : "—"
          }}
        </div>
      </div>
    </div>

    <!-- Auth required (host did not supply a token, or it was rejected) -->
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

    <!-- Loading -->
    <div *ngIf="loading" class="card" style="margin-top: 16px">
      <div class="empty-state">
        <div class="empty-icon">⏳</div>
        <div class="empty-title">Loading suggestions…</div>
      </div>
    </div>

    <!-- Load error (non-auth) -->
    <div *ngIf="loadError && !authError" class="card" style="margin-top: 16px">
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <div class="empty-title">Could not load suggestions</div>
        <div class="empty-desc">{{ loadError }}</div>
        <button
          class="btn btn-secondary"
          style="margin-top: 12px"
          (click)="load()"
        >
          Retry
        </button>
      </div>
    </div>

    <!-- Clusters -->
    <ng-container *ngIf="!loading && !authError && !loadError">
      <div
        *ngFor="let cluster of clusters"
        class="cluster-card card"
        style="margin-top: 16px"
      >
        <div class="card-header">
          {{ clusterTitle(cluster) }} — Similarity:
          {{ topSimilarity(cluster) | number: "1.0-0" }}%
          <span class="badge badge-info" style="margin-left: 8px">{{
            cluster.status
          }}</span>
        </div>
        <div class="card-body">
          <div class="item-comparison">
            <div *ngFor="let c of cluster.candidates" class="item-row">
              <span class="item-code">{{ c.item.itemCode }}</span>
              <span class="item-desc">{{ c.item.description }}</span>
              <span class="item-meta">
                {{ c.item.category }} · {{ c.item.baseUom
                }}{{ c.item.packSize ? " · " + c.item.packSize : "" }}
              </span>
              <span class="item-score">{{
                c.similarityScore | number: "1.0-0"
              }}%</span>
              <span class="item-attrs">
                <span
                  *ngFor="let a of matchedAttributes(c)"
                  class="attr-chip"
                  >{{ a }}</span
                >
              </span>
              <span *ngIf="c.isSource" class="badge badge-success">Master</span>
            </div>
          </div>
          <div class="cluster-actions">
            <button
              class="btn btn-primary"
              [disabled]="busyId === cluster.id"
              (click)="merge(cluster)"
            >
              🔗 Merge
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
          <div class="empty-icon">📦</div>
          <div class="empty-title">No open suggestions</div>
          <div class="empty-desc">
            All item deduplication suggestions have been reviewed.
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
      .kpi-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
      }
      .item-comparison {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .item-row {
        display: grid;
        grid-template-columns: 120px 1fr 200px 70px 1fr 80px;
        align-items: center;
        gap: 12px;
        padding: 10px 12px;
        border: 1px solid var(--color-border-light);
        border-radius: 6px;
        font-size: 13px;
      }
      .item-code {
        font-family: monospace;
        font-size: 12px;
        background: var(--color-surface-alt);
        padding: 2px 6px;
        border-radius: 3px;
      }
      .item-meta {
        font-size: 12px;
        color: var(--color-text-secondary);
      }
      .item-score {
        font-weight: 600;
      }
      .item-attrs {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
      }
      .attr-chip {
        font-size: 11px;
        background: var(--color-surface-alt);
        color: var(--color-text-secondary);
        padding: 1px 6px;
        border-radius: 10px;
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
export class ItemDedupComponent implements OnInit {
  private dedup = inject(DedupService);

  clusters: ItemDedupCluster[] = [];
  openCount = 0;
  resolvedThisMonth = 0;
  lastModelRun: string | null = null;
  modelVersion: string | null = null;

  loading = false;
  authError = false;
  loadError: string | null = null;
  busyId: string | null = null;
  toast: { type: string; message: string } | null = null;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    // Always attempt the call. The backend decides whether auth is required:
    // if it responds 401/403 we show the auth-required state; otherwise (a valid
    // token, or the Dedup:AllowAnonymous testing flag) the data loads.
    this.loading = true;
    this.authError = false;
    this.loadError = null;

    // Fetch all clusters so we can show open suggestions and derive KPIs.
    this.dedup.getItemClusters().subscribe({
      next: (all) => {
        this.clusters = all.filter((c) => c.status === "Open");
        this.computeKpis(all);
        this.loading = false;
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        if (err.status === 401 || err.status === 403) {
          this.authError = true;
        } else {
          this.loadError = this.extractError(err);
        }
      },
    });
  }

  private computeKpis(all: ItemDedupCluster[]): void {
    this.openCount = all.filter((c) => c.status === "Open").length;

    const now = new Date();
    this.resolvedThisMonth = all.filter((c) => {
      if (c.status === "Open" || !c.resolvedAt) return false;
      const d = new Date(c.resolvedAt);
      return (
        d.getUTCFullYear() === now.getUTCFullYear() &&
        d.getUTCMonth() === now.getUTCMonth()
      );
    }).length;

    const latest = all
      .map((c) => c.createdAt)
      .filter(Boolean)
      .sort()
      .pop();
    this.lastModelRun = latest ?? null;
    // Model version of the most recently created cluster, if any.
    const latestCluster = all
      .slice()
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .pop();
    this.modelVersion = latestCluster?.modelVersion ?? null;
  }

  clusterTitle(cluster: ItemDedupCluster): string {
    const source = cluster.candidates.find((c) => c.isSource);
    return (source ?? cluster.candidates[0])?.item.description ?? "Cluster";
  }

  topSimilarity(cluster: ItemDedupCluster): number {
    return cluster.candidates.reduce(
      (max, c) => Math.max(max, c.similarityScore),
      0,
    );
  }

  matchedAttributes(candidate: ItemDedupCandidate): string[] {
    if (!candidate.matchedAttributes) return [];
    try {
      const parsed = JSON.parse(candidate.matchedAttributes);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }

  merge(cluster: ItemDedupCluster): void {
    const source =
      cluster.candidates.find((c) => c.isSource) ?? cluster.candidates[0];
    if (!source) {
      this.showToast("error", "Cluster has no items to merge.");
      return;
    }
    this.busyId = cluster.id;
    this.dedup.merge(cluster.id, source.itemId).subscribe({
      next: (res) => {
        this.removeCluster(cluster);
        this.showToast("success", res?.message ?? "Item merge completed.");
      },
      error: (err: HttpErrorResponse) => {
        this.busyId = null;
        this.showToast("error", this.extractError(err));
      },
    });
  }

  dismiss(cluster: ItemDedupCluster): void {
    this.busyId = cluster.id;
    this.dedup.dismiss(cluster.id).subscribe({
      next: (res) => {
        this.removeCluster(cluster);
        this.showToast(
          "success",
          res?.message ?? `Suggestion for "${this.clusterTitle(cluster)}" dismissed`,
        );
      },
      error: (err: HttpErrorResponse) => {
        this.busyId = null;
        this.showToast("error", this.extractError(err));
      },
    });
  }

  private removeCluster(cluster: ItemDedupCluster): void {
    this.clusters = this.clusters.filter((c) => c.id !== cluster.id);
    this.openCount = this.clusters.length;
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
