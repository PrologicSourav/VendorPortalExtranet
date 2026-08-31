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
  templateUrl: "./item-dedup.component.html",
  styleUrl: "./item-dedup.component.css",
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
