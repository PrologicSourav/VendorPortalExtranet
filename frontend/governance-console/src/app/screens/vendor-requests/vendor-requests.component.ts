import { Component, OnInit, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { GovApiService, VendorRequestQueueItem } from "../../services/gov-api.service";

@Component({
  selector: "app-vendor-requests",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./vendor-requests.component.html",
  styleUrl: "./vendor-requests.component.css",
})
export class VendorRequestsComponent implements OnInit {
  private govApi = inject(GovApiService);

  statusFilter: "Pending" | "Approved" | "Rejected" = "Pending";
  requests: VendorRequestQueueItem[] = [];
  loading = false;
  busyId: string | null = null;
  toast: { type: string; message: string } | null = null;

  ngOnInit(): void {
    this.load();
  }

  switchTab(status: "Pending" | "Approved" | "Rejected"): void {
    if (this.statusFilter === status) return;
    this.statusFilter = status;
    this.load();
  }

  private load(): void {
    this.loading = true;
    this.govApi.getVendorRequestQueue(this.statusFilter).subscribe({
      next: (rows) => {
        this.requests = rows ?? [];
        this.loading = false;
      },
      error: () => {
        this.requests = [];
        this.loading = false;
      },
    });
  }

  approve(r: VendorRequestQueueItem): void {
    this.busyId = r.id;
    this.govApi.approveVendorRequest(r.id).subscribe({
      next: () => {
        this.busyId = null;
        this.showToast("success", `Approved — ${r.vendorName} now has access.`);
        this.load();
      },
      error: () => {
        this.busyId = null;
        this.showToast("error", "Could not approve the request.");
      },
    });
  }

  reject(r: VendorRequestQueueItem): void {
    this.busyId = r.id;
    this.govApi.rejectVendorRequest(r.id).subscribe({
      next: () => {
        this.busyId = null;
        this.showToast("success", "Request rejected.");
        this.load();
      },
      error: () => {
        this.busyId = null;
        this.showToast("error", "Could not reject the request.");
      },
    });
  }

  private showToast(type: string, message: string): void {
    this.toast = { type, message };
    setTimeout(() => (this.toast = null), 3000);
  }
}
