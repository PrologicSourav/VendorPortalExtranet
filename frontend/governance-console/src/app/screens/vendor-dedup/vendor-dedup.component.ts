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
  templateUrl: "./vendor-dedup.component.html",
  styleUrl: "./vendor-dedup.component.css",
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
