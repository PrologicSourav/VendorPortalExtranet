import { Component, OnInit, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { HttpErrorResponse } from "@angular/common/http";
import { GovApiService } from "../../services/gov-api.service";

@Component({
  selector: "app-kyc-review",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./kyc-review.component.html",
  styleUrl: "./kyc-review.component.css",
})
export class KycReviewComponent implements OnInit {
  private api = inject(GovApiService);

  tab = "pending";
  selectedVendor: any = null;
  toast: any = null;
  vendors: any[] = [];
  busy = false;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    // Full vendor master, so the pending/validated/blocked/all tabs all work.
    this.api.getVendors().subscribe({
      next: (res) => {
        this.vendors = (res?.items ?? []).map((v) => ({
          id: v.id,
          name: v.legalName,
          contact: v.contactEmail || v.contactPhone || "—",
          gstin: v.gstin || "—",
          city: v.city || "—",
          submittedBy: "—",
          entity: "—",
          status: this.mapKyc(v.kycStatus),
          panMatch: true,
        }));
      },
      error: (err: HttpErrorResponse) => {
        if (err.status === 401 || err.status === 403)
          this.showToast("error", "Authentication required — open from the host app.");
        else this.showToast("error", "Could not load vendors.");
      },
    });
  }

  private mapKyc(kycStatus: string): string {
    switch (kycStatus) {
      case "Incomplete":
        return "Pending";
      case "Validated":
        return "Validated";
      case "Blocked":
        return "Blocked";
      case "Expired":
        return "Expired";
      default:
        return kycStatus;
    }
  }

  get pendingCount(): number {
    return this.vendors.filter((v) => v.status === "Pending").length;
  }
  get validatedCount(): number {
    return this.vendors.filter((v) => v.status === "Validated").length;
  }
  get blockedCount(): number {
    return this.vendors.filter((v) => v.status === "Blocked").length;
  }

  documents = [
    {
      name: "GST Registration Certificate",
      verified: true,
      expiry: null,
      expiryDays: null,
    },
    { name: "PAN Card", verified: true, expiry: null, expiryDays: null },
    {
      name: "MSME Certificate (Udyam)",
      verified: false,
      expiry: "2025-09-15",
      expiryDays: 72,
    },
    {
      name: "Trade License",
      verified: false,
      expiry: "2025-08-01",
      expiryDays: 27,
    },
    {
      name: "Insurance Certificate",
      verified: false,
      expiry: "2025-12-31",
      expiryDays: 180,
    },
  ];

  get filteredVendors() {
    if (this.tab === "all") return this.vendors;
    return this.vendors.filter((v) => v.status.toLowerCase() === this.tab);
  }

  getStatusBadge(status: string): string {
    const map: Record<string, string> = {
      Pending: "badge-warning",
      Validated: "badge-success",
      Blocked: "badge-error",
    };
    return map[status] || "badge-muted";
  }

  openDetail(vendor: any) {
    this.selectedVendor = vendor;
  }

  validateVendor() {
    if (!this.selectedVendor || this.busy) return;
    const v = this.selectedVendor;
    this.busy = true;
    this.api.validateKyc(v.id).subscribe({
      next: () => {
        this.busy = false;
        v.status = "Validated";
        this.showToast("success", `${v.name} validated successfully`);
        setTimeout(() => (this.selectedVendor = null), 1200);
      },
      error: () => {
        this.busy = false;
        this.showToast("error", `Could not validate ${v.name}`);
      },
    });
  }

  blockVendor() {
    if (!this.selectedVendor || this.busy) return;
    const v = this.selectedVendor;
    this.busy = true;
    this.api.blockKyc(v.id).subscribe({
      next: () => {
        this.busy = false;
        v.status = "Blocked";
        this.showToast("error", `${v.name} has been blocked`);
        setTimeout(() => (this.selectedVendor = null), 1200);
      },
      error: () => {
        this.busy = false;
        this.showToast("error", `Could not block ${v.name}`);
      },
    });
  }

  showToast(type: string, message: string) {
    this.toast = { type, message };
    setTimeout(() => (this.toast = null), 3000);
  }
}
