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
  template: `
    <div class="page-header">
      <h1>Web Prol'IFIC Mapping</h1>
      <p class="page-subtitle">
        Link each Vendor Portal vendor/property to its real Web Prol'IFIC (WISH)
        vendor_id / property_id, so the automatic PO sync can find it reliably —
        GSTIN/PAN matching alone misses vendors WISH never recorded a GSTIN for.
      </p>
    </div>

    <div class="tabs">
      <div class="tab" [class.active]="tab === 'vendors'" (click)="switchTab('vendors')">
        Vendors
      </div>
      <div class="tab" [class.active]="tab === 'properties'" (click)="switchTab('properties')">
        Properties
      </div>
    </div>

    <div class="search-bar">
      <input
        type="text"
        class="form-control search-input"
        [placeholder]="tab === 'vendors' ? 'Search by vendor name or GSTIN...' : 'Search by property name or code...'"
        [(ngModel)]="searchTerm"
        (ngModelChange)="onSearchChange($event)"
      />
    </div>

    <div *ngIf="loading" class="loading-state">Loading…</div>
    <div *ngIf="loadError" class="load-error" role="alert">Failed to load. Please try again.</div>

    <div class="card" *ngIf="!loading && !loadError && tab === 'vendors'">
      <table class="data-table">
        <thead>
          <tr>
            <th>Vendor</th>
            <th>GSTIN</th>
            <th>PAN</th>
            <th>WISH vendor_id</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let v of vendors">
            <td>{{ v.legalName }}</td>
            <td>{{ v.gstin || "—" }}</td>
            <td>{{ v.pan || "—" }}</td>
            <td>
              <input
                type="text"
                class="form-control inline-input"
                [(ngModel)]="draftValues[v.id]"
                placeholder="e.g. SUP_AE01"
              />
            </td>
            <td>
              <button
                class="btn btn-sm btn-primary"
                [disabled]="savingId === v.id || draftValues[v.id] === (v.wishVendorId || '')"
                (click)="saveVendor(v)"
              >
                {{ savingId === v.id ? "Saving…" : "Save" }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <div *ngIf="vendors.length === 0" class="empty-state">
        <div class="empty-icon">🏢</div>
        <div class="empty-title">No vendors found</div>
      </div>
    </div>

    <div class="card" *ngIf="!loading && !loadError && tab === 'properties'">
      <table class="data-table">
        <thead>
          <tr>
            <th>Property</th>
            <th>Code</th>
            <th>Buying Entity</th>
            <th>WISH property_id</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let p of properties">
            <td>{{ p.name }}</td>
            <td>{{ p.code || "—" }}</td>
            <td>{{ p.buyingEntityName }}</td>
            <td>
              <input
                type="text"
                class="form-control inline-input"
                [(ngModel)]="draftValues[p.id]"
                placeholder="e.g. CCEHB"
              />
            </td>
            <td>
              <button
                class="btn btn-sm btn-primary"
                [disabled]="savingId === p.id || draftValues[p.id] === (p.wishPropertyId || '')"
                (click)="saveProperty(p)"
              >
                {{ savingId === p.id ? "Saving…" : "Save" }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <div *ngIf="properties.length === 0" class="empty-state">
        <div class="empty-icon">🏨</div>
        <div class="empty-title">No properties found</div>
      </div>
    </div>

    <div *ngIf="toast" class="toast" [ngClass]="'toast-' + toast.type">
      {{ toast.message }}
    </div>
  `,
  styles: [
    `
      .page-header {
        margin-bottom: 20px;
      }
      .page-header h1 {
        font-size: 22px;
        font-weight: 700;
        color: var(--color-primary);
      }
      .page-subtitle {
        font-size: 13px;
        color: var(--color-text-secondary);
        margin-top: 4px;
        max-width: 640px;
      }
      .search-bar {
        margin: 16px 0;
      }
      .search-input {
        width: 320px;
      }
      .loading-state {
        padding: 40px;
        text-align: center;
        color: var(--color-text-secondary);
        font-size: 13px;
      }
      .load-error {
        padding: 16px;
        border-radius: 8px;
        background: var(--color-error-soft-bg, #fde8e8);
        color: var(--color-error);
        font-size: 13px;
        margin-bottom: 16px;
      }
      .inline-input {
        width: 160px;
        padding: 6px 8px;
        font-size: 12px;
      }
      .btn-sm {
        padding: 4px 10px;
        font-size: 12px;
      }
    `,
  ],
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
