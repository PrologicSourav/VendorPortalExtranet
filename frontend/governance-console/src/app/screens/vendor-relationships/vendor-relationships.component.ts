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
  template: `
    <div class="page-header">
      <h1>Vendor Relationships</h1>
      <p class="page-subtitle">
        Attach a vendor to a Chain (all its properties) or a specific Property.
        A vendor is one global account — this screen never creates a second one;
        it only adds where an existing (or newly created) vendor is allowed to
        operate.
      </p>
    </div>

    <div class="card search-card">
      <div class="search-row">
        <input
          type="text"
          class="form-control search-input"
          placeholder="Search vendor by name or GSTIN..."
          [(ngModel)]="searchTerm"
          (ngModelChange)="onSearchChange($event)"
        />
        <button class="btn btn-secondary" (click)="showCreateForm = !showCreateForm">
          {{ showCreateForm ? "Cancel" : "+ New Vendor" }}
        </button>
      </div>

      <div class="create-form" *ngIf="showCreateForm">
        <input type="text" class="form-control" placeholder="Legal name" [(ngModel)]="newVendorName" />
        <input type="text" class="form-control" placeholder="GSTIN (optional)" [(ngModel)]="newVendorGstin" />
        <button class="btn btn-primary" [disabled]="!newVendorName || creating" (click)="createVendor()">
          {{ creating ? "Creating…" : "Create & Select" }}
        </button>
      </div>

      <div class="results" *ngIf="searchResults.length > 0 && !selectedVendor">
        <div class="result-row" *ngFor="let v of searchResults" (click)="selectVendor(v)">
          <span class="result-name">{{ v.legalName }}</span>
          <span class="result-gstin">{{ v.gstin || "—" }}</span>
        </div>
      </div>
    </div>

    <div class="card" *ngIf="selectedVendor">
      <div class="vendor-header">
        <div>
          <div class="vendor-name">{{ selectedVendor.legalName }}</div>
          <div class="vendor-sub">{{ selectedVendor.gstin || "No GSTIN" }} · KYC: {{ selectedVendor.kycStatus }}</div>
        </div>
        <button class="btn btn-secondary btn-sm" (click)="selectedVendor = null; searchResults = []">
          Change vendor
        </button>
      </div>

      <h3>Current relationships</h3>
      <div *ngIf="loadingRelationships" class="loading-state">Loading…</div>
      <table class="data-table" *ngIf="!loadingRelationships">
        <thead>
          <tr>
            <th>Scope</th>
            <th>Chain</th>
            <th>Property</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let r of relationships">
            <td>{{ r.scopeType }}</td>
            <td>{{ r.buyingEntityName }}</td>
            <td>{{ r.propertyName || "(entire chain)" }}</td>
            <td>
              <span class="badge" [ngClass]="'badge-' + r.status.toLowerCase()">{{ r.status }}</span>
            </td>
            <td>
              <button
                class="btn btn-sm"
                [ngClass]="r.status === 'Active' ? 'btn-danger' : 'btn-primary'"
                (click)="toggleStatus(r)"
              >
                {{ r.status === "Active" ? "Revoke" : "Reactivate" }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <div *ngIf="!loadingRelationships && relationships.length === 0" class="empty-state">
        <div class="empty-title">No relationships yet</div>
      </div>

      <h3>Add relationship</h3>
      <div class="add-form">
        <select class="form-control" [(ngModel)]="newScope">
          <option value="Chain">Entire Chain</option>
          <option value="Property">Specific Property</option>
        </select>
        <select class="form-control" [(ngModel)]="newBuyingEntityId" (ngModelChange)="newPropertyId = null">
          <option [ngValue]="null">Select chain…</option>
          <option *ngFor="let be of buyingEntities" [ngValue]="be.id">{{ be.name }}</option>
        </select>
        <select
          class="form-control"
          *ngIf="newScope === 'Property'"
          [(ngModel)]="newPropertyId"
          [disabled]="!newBuyingEntityId"
        >
          <option [ngValue]="null">Select property…</option>
          <option *ngFor="let p of propertiesFor(newBuyingEntityId)" [ngValue]="p.id">{{ p.name }}</option>
        </select>
        <button
          class="btn btn-primary"
          [disabled]="!canAdd() || adding"
          (click)="addRelationship()"
        >
          {{ adding ? "Adding…" : "Add" }}
        </button>
      </div>
    </div>

    <div *ngIf="toast" class="toast" [ngClass]="'toast-' + toast.type">{{ toast.message }}</div>
  `,
  styles: [
    `
      .page-header { margin-bottom: 20px; }
      .page-header h1 { font-size: 22px; font-weight: 700; color: var(--color-primary); }
      .page-subtitle { font-size: 13px; color: var(--color-text-secondary); margin-top: 4px; max-width: 640px; }
      .card { margin-bottom: 16px; }
      .search-row { display: flex; gap: 10px; }
      .search-input { flex: 1; max-width: 360px; }
      .create-form { display: flex; gap: 10px; margin-top: 12px; }
      .create-form .form-control { max-width: 260px; }
      .results { margin-top: 12px; border-top: 1px solid var(--color-border); }
      .result-row { display: flex; justify-content: space-between; padding: 10px 4px; cursor: pointer; border-bottom: 1px solid var(--color-border); }
      .result-row:hover { background: var(--color-surface-alt); }
      .result-gstin { color: var(--color-text-secondary); font-size: 12px; }
      .vendor-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
      .vendor-name { font-size: 16px; font-weight: 700; }
      .vendor-sub { font-size: 12px; color: var(--color-text-secondary); margin-top: 2px; }
      h3 { font-size: 13px; font-weight: 700; margin: 18px 0 10px; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.5px; }
      .add-form { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
      .add-form .form-control { width: 200px; }
      .badge { padding: 3px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
      .badge-active { background: var(--color-success-soft-bg, #e6f7ee); color: var(--color-success, #1a7f4e); }
      .badge-inactive { background: var(--color-surface-alt); color: var(--color-text-muted); }
      .btn-sm { padding: 4px 10px; font-size: 12px; }
      .loading-state { padding: 24px; text-align: center; color: var(--color-text-secondary); font-size: 13px; }
      .empty-state { padding: 16px 4px; color: var(--color-text-muted); font-size: 13px; }
    `,
  ],
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
