import { Component, OnInit, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import {
  CatalogueReview,
  GovApiService,
} from "../../services/gov-api.service";

/** Maps a UI tab to the catalogue status it lists. */
const TAB_STATUS: Record<string, string> = {
  pending: "Submitted",
  approved: "Approved",
  rejected: "Rejected",
};

@Component({
  selector: "app-catalogue-approvals",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./catalogue-approvals.component.html",
  styleUrl: "./catalogue-approvals.component.css",
})
export class CatalogueApprovalsComponent implements OnInit {
  private govApi = inject(GovApiService);

  tab = "pending";
  catalogues: CatalogueReview[] = [];
  loading = false;
  loadError = false;
  actingId: string | null = null;
  toast: { type: string; message: string } | null = null;

  ngOnInit(): void {
    this.load();
  }

  switchTab(tab: string): void {
    if (this.tab === tab) return;
    this.tab = tab;
    this.load();
  }

  private load(): void {
    this.loading = true;
    this.loadError = false;
    this.govApi.getCataloguesForReview(TAB_STATUS[this.tab]).subscribe({
      next: (rows) => {
        this.catalogues = rows ?? [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.loadError = true;
      },
    });
  }

  getStatusBadge(status: string): string {
    const map: Record<string, string> = {
      Submitted: "badge-warning",
      Approved: "badge-success",
      Rejected: "badge-error",
    };
    return map[status] || "badge-muted";
  }

  approve(cat: CatalogueReview): void {
    this.actingId = cat.id;
    this.govApi.approveCatalogue(cat.id).subscribe({
      next: () => {
        this.actingId = null;
        this.showToast("success", `${cat.supplierName} catalogue approved`);
        this.load();
      },
      error: () => {
        this.actingId = null;
        this.showToast("error", "Could not approve the catalogue. Please try again.");
      },
    });
  }

  reject(cat: CatalogueReview): void {
    const reason = (window.prompt("Reason for rejection (optional):") ?? "").trim();
    this.actingId = cat.id;
    this.govApi.rejectCatalogue(cat.id, reason).subscribe({
      next: () => {
        this.actingId = null;
        this.showToast("error", `${cat.supplierName} catalogue rejected`);
        this.load();
      },
      error: () => {
        this.actingId = null;
        this.showToast("error", "Could not reject the catalogue. Please try again.");
      },
    });
  }

  private showToast(type: string, message: string): void {
    this.toast = { type, message };
    setTimeout(() => (this.toast = null), 3000);
  }
}
