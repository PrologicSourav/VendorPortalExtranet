import { Component, OnInit, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import {
  GovApiService,
  WishPropertyMapping,
  WishVendorMapping,
} from "../../services/gov-api.service";

@Component({
  selector: "app-wish-mapping",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./wish-mapping.component.html",
  styleUrl: "./wish-mapping.component.css",
})
export class WishMappingComponent implements OnInit {
  private govApi = inject(GovApiService);

  tab: "vendors" | "properties" = "vendors";
  searchTerm = "";
  vendors: WishVendorMapping[] = [];
  properties: WishPropertyMapping[] = [];
  draftValues: Record<string, string> = {};
  loading = false;
  loadError = false;
  savingId: string | null = null;
  toast: { type: string; message: string } | null = null;

  private searchDebounce: any;

  ngOnInit(): void {
    this.load();
  }

  switchTab(tab: "vendors" | "properties"): void {
    if (this.tab === tab) return;
    this.tab = tab;
    this.searchTerm = "";
    this.load();
  }

  onSearchChange(_value: string): void {
    clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => this.load(), 300);
  }

  private load(): void {
    this.loading = true;
    this.loadError = false;
    const search = this.searchTerm || undefined;

    if (this.tab === "vendors") {
      this.govApi.getWishVendorMappings(search).subscribe({
        next: (rows) => {
          this.vendors = rows ?? [];
          this.draftValues = {};
          for (const v of this.vendors) this.draftValues[v.id] = v.wishVendorId || "";
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.loadError = true;
        },
      });
    } else {
      this.govApi.getWishPropertyMappings(search).subscribe({
        next: (rows) => {
          this.properties = rows ?? [];
          this.draftValues = {};
          for (const p of this.properties) this.draftValues[p.id] = p.wishPropertyId || "";
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.loadError = true;
        },
      });
    }
  }

  saveVendor(v: WishVendorMapping): void {
    this.savingId = v.id;
    const value = (this.draftValues[v.id] || "").trim() || null;
    this.govApi.setWishVendorMapping(v.id, value).subscribe({
      next: () => {
        this.savingId = null;
        v.wishVendorId = value;
        this.showToast("success", `Mapping saved for ${v.legalName}.`);
      },
      error: () => {
        this.savingId = null;
        this.showToast("error", "Could not save the mapping. Please try again.");
      },
    });
  }

  saveProperty(p: WishPropertyMapping): void {
    this.savingId = p.id;
    const value = (this.draftValues[p.id] || "").trim() || null;
    this.govApi.setWishPropertyMapping(p.id, value).subscribe({
      next: () => {
        this.savingId = null;
        p.wishPropertyId = value;
        this.showToast("success", `Mapping saved for ${p.name}.`);
      },
      error: () => {
        this.savingId = null;
        this.showToast("error", "Could not save the mapping. Please try again.");
      },
    });
  }

  private showToast(type: string, message: string): void {
    this.toast = { type, message };
    setTimeout(() => (this.toast = null), 3000);
  }
}
