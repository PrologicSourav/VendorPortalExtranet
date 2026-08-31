import { Component, OnInit, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import {
  DeliveryNoteSummary,
  GovApiService,
} from "../../services/gov-api.service";

const TAB_STATUS: Record<string, string> = {
  pending: "Submitted",
  received: "Received",
};

@Component({
  selector: "app-delivery-note-receiving",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./delivery-note-receiving.component.html",
  styleUrl: "./delivery-note-receiving.component.css",
})
export class DeliveryNoteReceivingComponent implements OnInit {
  private govApi = inject(GovApiService);

  tab = "pending";
  searchTerm = "";
  notes: DeliveryNoteSummary[] = [];
  loading = false;
  loadError = false;
  receivingId: string | null = null;
  toast: { type: string; message: string } | null = null;

  private searchDebounce: any;

  ngOnInit(): void {
    this.load();
  }

  switchTab(tab: string): void {
    if (this.tab === tab) return;
    this.tab = tab;
    this.load();
  }

  onSearchChange(_value: string): void {
    clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => this.load(), 300);
  }

  private load(): void {
    this.loading = true;
    this.loadError = false;
    this.govApi.searchDeliveryNotes(TAB_STATUS[this.tab], this.searchTerm || undefined).subscribe({
      next: (res) => {
        this.notes = res.items ?? [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.loadError = true;
      },
    });
  }

  markReceived(dn: DeliveryNoteSummary): void {
    this.receivingId = dn.id;
    this.govApi.receiveDeliveryNote(dn.id).subscribe({
      next: () => {
        this.receivingId = null;
        this.showToast("success", `${dn.deliveryNoteNumber} marked received.`);
        this.load();
      },
      error: (err) => {
        this.receivingId = null;
        this.showToast(
          "error",
          err?.error?.message ?? "Could not mark this delivery note received.",
        );
      },
    });
  }

  getStatusBadge(status: string): string {
    const map: Record<string, string> = {
      Draft: "badge-muted",
      Submitted: "badge-warning",
      Received: "badge-success",
    };
    return map[status] || "badge-muted";
  }

  private showToast(type: string, message: string): void {
    this.toast = { type, message };
    setTimeout(() => (this.toast = null), 3000);
  }
}
