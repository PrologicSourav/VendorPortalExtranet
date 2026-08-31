import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

@Component({
  selector: "app-supplier-submissions",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./supplier-submissions.component.html",
  styleUrl: "./supplier-submissions.component.css",
})
export class SupplierSubmissionsComponent {
  tab = "pending";
  selectedSub: any = null;
  reviewNotes = "";
  toast: any = null;

  submissions = [
    {
      id: 1,
      supplier: "Mumbai Fresh Foods",
      type: "New Vendor",
      entity: "Accor — North India",
      submitted: "Jul 2, 2025",
      status: "Pending",
    },
    {
      id: 2,
      supplier: "Green Valley Farms",
      type: "Catalogue Update",
      entity: "Accor — North India",
      submitted: "Jul 4, 2025",
      status: "Pending",
    },
    {
      id: 3,
      supplier: "Delhi Spice Traders",
      type: "KYC Update",
      entity: "Taj Hotels — West",
      submitted: "Jul 5, 2025",
      status: "Pending",
    },
    {
      id: 4,
      supplier: "Apex Chemical Supplies",
      type: "New Vendor",
      entity: "Taj Hotels — West",
      submitted: "Jun 28, 2025",
      status: "Approved",
    },
    {
      id: 5,
      supplier: "Coastal Seafood Exports",
      type: "Catalogue Update",
      entity: "Accor — North India",
      submitted: "Jun 25, 2025",
      status: "Rejected",
    },
  ];

  get filteredSubmissions() {
    if (this.tab === "all") return this.submissions;
    return this.submissions.filter((s) => s.status.toLowerCase() === this.tab);
  }

  getTypeBadge(type: string): string {
    const map: Record<string, string> = {
      "New Vendor": "badge-info",
      "Catalogue Update": "badge-warning",
      "KYC Update": "badge-purple",
    };
    return map[type] || "badge-muted";
  }

  getStatusBadge(status: string): string {
    const map: Record<string, string> = {
      Pending: "badge-warning",
      Approved: "badge-success",
      Rejected: "badge-error",
    };
    return map[status] || "badge-muted";
  }

  openDetail(sub: any) {
    this.selectedSub = sub;
  }

  approveSubmission(sub: any) {
    sub.status = "Approved";
    this.selectedSub = null;
    this.showToast("success", `Submission approved for ${sub.supplier}`);
  }

  rejectSubmission(sub: any) {
    sub.status = "Rejected";
    this.selectedSub = null;
    this.showToast("error", `Submission rejected for ${sub.supplier}`);
  }

  showToast(type: string, message: string) {
    this.toast = { type, message };
    setTimeout(() => (this.toast = null), 3000);
  }
}
