import { Component, inject, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { TranslatePipe } from "@ngx-translate/core";
import { ApiService } from "../../services/api.service";
import { AuthService } from "../../services/auth.service";
import { PropertyContextService } from "../../services/property-context.service";

@Component({
  selector: "app-access-requests",
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: "./access-requests.component.html",
  styleUrl: "./access-requests.component.css",
})
export class AccessRequestsComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private propertyCtx = inject(PropertyContextService);

  relationships: any[] = [];
  requests: any[] = [];
  buyingEntities: any[] = [];
  loadingRelationships = false;

  scope: "Chain" | "Property" = "Property";
  selectedEntityId: string | null = null;
  selectedPropertyId: string | null = null;
  submitting = false;
  submitError: string | null = null;

  ngOnInit(): void {
    const vendorId = this.auth.user()?.vendorId;
    if (!vendorId) return;

    // A relationship could have just been approved in a governance-console
    // session with no way to push into this tab — always refetch here rather
    // than trusting whatever the topbar switcher cached at login.
    this.propertyCtx.loadForVendor(vendorId, true);

    this.loadingRelationships = true;
    this.api.getVendorRelationships(vendorId).subscribe({
      next: (rows) => {
        this.relationships = rows ?? [];
        this.loadingRelationships = false;
      },
      error: () => (this.loadingRelationships = false),
    });

    this.api.getVendorRequests(vendorId).subscribe({
      next: (rows) => (this.requests = rows ?? []),
      error: () => (this.requests = []),
    });

    this.api.getBuyingEntities().subscribe({
      next: (rows) => (this.buyingEntities = rows ?? []),
      error: () => (this.buyingEntities = []),
    });
  }

  propertiesFor(buyingEntityId: string | null): any[] {
    if (!buyingEntityId) return [];
    return this.buyingEntities.find((be) => be.id === buyingEntityId)?.properties ?? [];
  }

  canSubmit(): boolean {
    if (!this.selectedEntityId) return false;
    if (this.scope === "Property" && !this.selectedPropertyId) return false;
    return true;
  }

  submitRequest(): void {
    const vendorId = this.auth.user()?.vendorId;
    if (!vendorId || !this.canSubmit()) return;

    this.submitting = true;
    this.submitError = null;
    this.api
      .requestVendorAccess({
        vendorId,
        requestedBuyingEntityId: this.selectedEntityId!,
        requestedPropertyId: this.scope === "Property" ? this.selectedPropertyId : null,
        requestType: this.scope,
      })
      .subscribe({
        next: () => {
          this.submitting = false;
          this.selectedEntityId = null;
          this.selectedPropertyId = null;
          // Re-fetch rather than splice in the raw created entity — the list
          // endpoint returns the joined chain/property names this component
          // renders, the POST response doesn't.
          this.api.getVendorRequests(vendorId).subscribe({
            next: (rows) => (this.requests = rows ?? []),
          });
        },
        error: (err) => {
          this.submitting = false;
          this.submitError = err?.error?.error || "Could not submit the request.";
        },
      });
  }
}
