import { Component, OnInit, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import {
  GovApiService,
  PurchaseOrderSummary,
} from "../../services/gov-api.service";

@Component({
  selector: "app-po-documents",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./po-documents.component.html",
  styleUrl: "./po-documents.component.css",
})
export class PoDocumentsComponent implements OnInit {
  private govApi = inject(GovApiService);

  searchTerm = "";
  purchaseOrders: PurchaseOrderSummary[] = [];
  loading = false;
  loadError = false;
  uploadingId: string | null = null;
  toast: { type: string; message: string } | null = null;

  private searchDebounce: any;

  ngOnInit(): void {
    this.load();
  }

  onSearchChange(_value: string): void {
    clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => this.load(), 300);
  }

  private load(): void {
    this.loading = true;
    this.loadError = false;
    this.govApi.searchPurchaseOrders(this.searchTerm || undefined).subscribe({
      next: (res) => {
        this.purchaseOrders = res.items ?? [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.loadError = true;
      },
    });
  }

  onFileSelected(po: PurchaseOrderSummary, files: FileList | null): void {
    const file = files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      this.showToast("error", "Only PDF files are accepted.");
      return;
    }
    this.uploadingId = po.id;
    this.govApi.uploadPoDocument(po.id, file).subscribe({
      next: () => {
        this.uploadingId = null;
        this.showToast("success", `Document uploaded for ${po.poNumber}.`);
        this.load();
      },
      error: (err) => {
        this.uploadingId = null;
        this.showToast(
          "error",
          err?.error?.message ?? "Could not upload the document. Please try again.",
        );
      },
    });
  }

  private showToast(type: string, message: string): void {
    this.toast = { type, message };
    setTimeout(() => (this.toast = null), 3000);
  }
}
