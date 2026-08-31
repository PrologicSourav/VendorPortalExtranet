import { Injectable, signal } from "@angular/core";
import { ApiService } from "./api.service";

export interface PropertyOption {
  id: string;
  name: string;
  code?: string | null;
  city?: string | null;
}

const STORAGE_KEY = "wp_selected_property";

/**
 * Which property (hotel) the vendor is currently viewing data for, driven by the
 * topbar property switcher. Selection is vendor-scoped — only properties this
 * vendor has an active VendorRelationship for (direct or chain-wide) — and null
 * means "all properties".
 */
@Injectable({ providedIn: "root" })
export class PropertyContextService {
  private readonly _properties = signal<PropertyOption[]>([]);
  readonly properties = this._properties.asReadonly();

  private readonly _selectedPropertyId = signal<string | null>(
    sessionStorage.getItem(STORAGE_KEY),
  );
  readonly selectedPropertyId = this._selectedPropertyId.asReadonly();

  private loadedForVendorId: string | null = null;

  constructor(private api: ApiService) {}

  /** Loads (once per vendor) the properties this vendor has purchase orders for. */
  loadForVendor(vendorId: string): void {
    if (this.loadedForVendorId === vendorId) return;
    this.loadedForVendorId = vendorId;
    this.api.getVendorProperties(vendorId).subscribe({
      next: (properties: PropertyOption[]) => {
        this._properties.set(properties ?? []);
        // A previously selected property that no longer applies to this vendor
        // (e.g. after switching accounts) shouldn't silently keep filtering.
        const stillValid = (properties ?? []).some(
          (p) => p.id === this._selectedPropertyId(),
        );
        if (!stillValid && this._selectedPropertyId() !== null) {
          this.selectProperty(null);
        }
      },
      error: () => this._properties.set([]),
    });
  }

  selectProperty(id: string | null): void {
    this._selectedPropertyId.set(id);
    if (id) sessionStorage.setItem(STORAGE_KEY, id);
    else sessionStorage.removeItem(STORAGE_KEY);
  }
}
