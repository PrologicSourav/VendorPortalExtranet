import { Component, OnInit, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import {
  BuyingEntityOption,
  GovApiService,
  GovVendor,
  VendorRelationship,
} from "../../services/gov-api.service";

@Component({
  selector: "app-vendor-relationships",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./vendor-relationships.component.html",
  styleUrl: "./vendor-relationships.component.css",
})
export class VendorRelationshipsComponent implements OnInit {
  private govApi = inject(GovApiService);

  searchTerm = "";
  searchResults: GovVendor[] = [];
  selectedVendor: GovVendor | null = null;
  relationships: VendorRelationship[] = [];
  loadingRelationships = false;
  buyingEntities: BuyingEntityOption[] = [];

  showCreateForm = false;
  newVendorName = "";
  newVendorGstin = "";
  creating = false;

  newScope: "Chain" | "Property" = "Property";
  newBuyingEntityId: string | null = null;
  newPropertyId: string | null = null;
  adding = false;

  toast: { type: string; message: string } | null = null;
  private searchDebounce: any;

  ngOnInit(): void {
    this.govApi.getBuyingEntities().subscribe({
      next: (rows) => (this.buyingEntities = rows ?? []),
      error: () => (this.buyingEntities = []),
    });
  }

  onSearchChange(_value: string): void {
    clearTimeout(this.searchDebounce);
    if (!this.searchTerm.trim()) {
      this.searchResults = [];
      return;
    }
    this.searchDebounce = setTimeout(() => {
      this.govApi.getVendors(undefined, this.searchTerm).subscribe({
        next: (res: any) => (this.searchResults = res?.items ?? []),
        error: () => (this.searchResults = []),
      });
    }, 300);
  }

  selectVendor(v: GovVendor): void {
    this.selectedVendor = v;
    this.searchResults = [];
    this.searchTerm = "";
    this.loadRelationships();
  }

  createVendor(): void {
    if (!this.newVendorName) return;
    this.creating = true;
    this.govApi.createVendor(this.newVendorName, this.newVendorGstin || null).subscribe({
      next: (vendor) => {
        this.creating = false;
        this.showCreateForm = false;
        this.newVendorName = "";
        this.newVendorGstin = "";
        this.showToast("success", `${vendor.legalName} created.`);
        this.selectVendor(vendor);
      },
      error: (err) => {
        this.creating = false;
        this.showToast("error", err?.error?.error || "Could not create the vendor.");
      },
    });
  }

  propertiesFor(buyingEntityId: string | null): { id: string; name: string }[] {
    if (!buyingEntityId) return [];
    return this.buyingEntities.find((be) => be.id === buyingEntityId)?.properties ?? [];
  }

  canAdd(): boolean {
    if (!this.newBuyingEntityId) return false;
    if (this.newScope === "Property" && !this.newPropertyId) return false;
    return true;
  }

  addRelationship(): void {
    if (!this.selectedVendor || !this.canAdd()) return;
    this.adding = true;
    this.govApi
      .createVendorRelationship({
        vendorId: this.selectedVendor.id,
        buyingEntityId: this.newBuyingEntityId!,
        propertyId: this.newScope === "Property" ? this.newPropertyId : null,
        scopeType: this.newScope,
      })
      .subscribe({
        next: () => {
          this.adding = false;
          this.newBuyingEntityId = null;
          this.newPropertyId = null;
          this.showToast("success", "Relationship added.");
          this.loadRelationships();
        },
        error: (err) => {
          this.adding = false;
          this.showToast("error", err?.error?.error || "Could not add the relationship.");
        },
      });
  }

  toggleStatus(r: VendorRelationship): void {
    const next = r.status === "Active" ? "Inactive" : "Active";
    this.govApi.setVendorRelationshipStatus(r.id, next).subscribe({
      next: () => {
        r.status = next;
        this.showToast("success", `Relationship ${next === "Active" ? "reactivated" : "revoked"}.`);
      },
      error: () => this.showToast("error", "Could not update the relationship."),
    });
  }

  private loadRelationships(): void {
    if (!this.selectedVendor) return;
    this.loadingRelationships = true;
    this.govApi.getVendorRelationships(this.selectedVendor.id).subscribe({
      next: (rows) => {
        this.relationships = rows ?? [];
        this.loadingRelationships = false;
      },
      error: () => {
        this.relationships = [];
        this.loadingRelationships = false;
      },
    });
  }

  private showToast(type: string, message: string): void {
    this.toast = { type, message };
    setTimeout(() => (this.toast = null), 3000);
  }
}
