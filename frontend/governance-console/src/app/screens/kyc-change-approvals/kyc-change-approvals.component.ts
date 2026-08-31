import { Component, OnInit, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { HttpErrorResponse } from "@angular/common/http";
import { GovApiService } from "../../services/gov-api.service";

@Component({
  selector: "app-kyc-change-approvals",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./kyc-change-approvals.component.html",
  styleUrl: "./kyc-change-approvals.component.css",
})
export class KycChangeApprovalsComponent implements OnInit {
  private api = inject(GovApiService);

  selectedReq: any = null;
  notes = "";
  toast: any = null;
  requests: any[] = [];
  busy = false;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.api.getPendingChangeRequests().subscribe({
      next: (reqs) => {
        this.requests = (reqs ?? []).map((r) => ({
          id: r.id,
          supplier: r.vendorId ? "Vendor " + r.vendorId.substring(0, 8) : "—",
          changeType: r.fieldChanged,
          field: r.fieldChanged,
          from: r.oldValue ?? "—",
          to: r.newValue ?? "—",
          submitted: r.requestedAt,
        }));
      },
      error: (err: HttpErrorResponse) => {
        if (err.status === 401 || err.status === 403)
          this.showToast("error", "Authentication required — open from the host app.");
        else this.showToast("error", "Could not load change requests.");
      },
    });
  }

  approve(req: any) {
    if (this.busy) return;
    this.busy = true;
    this.api.approveChangeRequest(req.id).subscribe({
      next: () => {
        this.busy = false;
        this.requests = this.requests.filter((r) => r.id !== req.id);
        this.selectedReq = null;
        this.showToast("success", `Change request approved for ${req.supplier}`);
      },
      error: () => {
        this.busy = false;
        this.showToast("error", "Could not approve the change request.");
      },
    });
  }

  reject(req: any) {
    if (this.busy) return;
    this.busy = true;
    this.api.rejectChangeRequest(req.id).subscribe({
      next: () => {
        this.busy = false;
        this.requests = this.requests.filter((r) => r.id !== req.id);
        this.selectedReq = null;
        this.showToast("error", `Change request rejected for ${req.supplier}`);
      },
      error: () => {
        this.busy = false;
        this.showToast("error", "Could not reject the change request.");
      },
    });
  }

  openDetail(req: any) {
    this.selectedReq = req;
  }

  showToast(type: string, message: string) {
    this.toast = { type, message };
    setTimeout(() => (this.toast = null), 3000);
  }
}
