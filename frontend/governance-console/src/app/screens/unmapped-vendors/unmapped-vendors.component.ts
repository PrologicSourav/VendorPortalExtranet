import { Component, OnInit, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { GovApiService, GovVendor, UnmappedVendorRow } from "../../services/gov-api.service";

@Component({
  selector: "app-unmapped-vendors",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./unmapped-vendors.component.html",
  styleUrl: "./unmapped-vendors.component.css",
})
export class UnmappedVendorsComponent implements OnInit {
  private govApi = inject(GovApiService);

  configured = true;
  loading = false;
  rows: UnmappedVendorRow[] = [];
  totalCount = 0;
  searchTerm = "";
  private searchDebounce: any;

  // Inline map/create panel state, keyed by the row being acted on.
  activeRow: UnmappedVendorRow | null = null;
  mode: "search" | "create" | null = null;
  vendorSearchTerm = "";
  vendorSearchResults: GovVendor[] = [];
  scopeType: "Chain" | "Property" = "Property";
  newVendorName = "";
  newVendorGstin = "";
  busy = false;

  toast: { type: string; message: string } | null = null;

  ngOnInit(): void {
    this.load();
  }

  onSearchChange(): void {
    clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => this.load(), 300);
  }

  private load(): void {
    this.loading = true;
    this.govApi.getUnmappedWishVendors(this.searchTerm || undefined).subscribe({
      next: (res) => {
        this.configured = res.configured;
        this.rows = res.items ?? [];
        this.totalCount = res.totalCount ?? this.rows.length;
        this.loading = false;
      },
      error: () => {
        this.rows = [];
        this.loading = false;
      },
    });
  }

  openMap(row: UnmappedVendorRow): void {
    this.activeRow = row;
    this.mode = "search";
    this.vendorSearchTerm = "";
    this.vendorSearchResults = [];
    this.scopeType = "Property";
    this.newVendorName = row.vendorName;
    this.newVendorGstin = row.gstin || "";
  }

  closePanel(): void {
    this.activeRow = null;
    this.mode = null;
  }

  onVendorSearchChange(): void {
    if (!this.vendorSearchTerm.trim()) {
      this.vendorSearchResults = [];
      return;
    }
    this.govApi.getVendors(undefined, this.vendorSearchTerm).subscribe({
      next: (res: any) => (this.vendorSearchResults = res?.items ?? []),
      error: () => (this.vendorSearchResults = []),
    });
  }

  linkToExisting(vendor: GovVendor): void {
    if (!this.activeRow) return;
    this.confirmMapping(vendor.id);
  }

  createAndLink(): void {
    if (!this.activeRow || !this.newVendorName) return;
    this.busy = true;
    this.govApi.createVendor(this.newVendorName, this.newVendorGstin || null).subscribe({
      next: (vendor) => this.confirmMapping(vendor.id),
      error: (err) => {
        this.busy = false;
        this.showToast("error", err?.error?.error || "Could not create the vendor.");
      },
    });
  }

  private confirmMapping(vendorId: string): void {
    const row = this.activeRow;
    if (!row || !row.buyingEntityId) return;
    this.busy = true;
    this.govApi
      .createVendorRelationship({
        vendorId,
        buyingEntityId: row.buyingEntityId,
        propertyId: this.scopeType === "Property" ? row.propertyId : null,
        scopeType: this.scopeType,
        externalVendorId: row.vendorId,
      })
      .subscribe({
        next: () => {
          this.busy = false;
          this.showToast("success", `Mapped ${row.vendorName} (WISH ${row.vendorId}).`);
          this.closePanel();
          this.load();
        },
        error: (err) => {
          this.busy = false;
          this.showToast("error", err?.error?.error || "Could not create the mapping.");
        },
      });
  }

  private showToast(type: string, message: string): void {
    this.toast = { type, message };
    setTimeout(() => (this.toast = null), 3000);
  }
}
