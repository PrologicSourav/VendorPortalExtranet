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

  /**
   * Loads the properties this vendor currently has access to. Cached per vendor
   * for the rest of the session — pass forceRefresh when the vendor's access may
   * have just changed (e.g. right after they view their own request/relationship
   * status), since a relationship approved in a separate governance-console
   * session has no way to push into an already-open supplier-portal tab.
   */
  loadForVendor(vendorId: string, forceRefresh = false): void {
    if (!forceRefresh && this.loadedForVendorId === vendorId) return;
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
