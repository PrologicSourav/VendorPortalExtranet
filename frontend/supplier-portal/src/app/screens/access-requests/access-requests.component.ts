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
  template: `
    <div class="page-header">
      <h1>{{ "access.title" | translate }}</h1>
      <p class="page-subtitle">{{ "access.subtitle" | translate }}</p>
    </div>

    <div class="card">
      <h3>{{ "access.current" | translate }}</h3>
      <div *ngIf="loadingRelationships" class="loading-state">{{ "access.loading" | translate }}</div>
      <ul class="rel-list" *ngIf="!loadingRelationships">
        <li *ngFor="let r of relationships">
          <strong>{{ r.buyingEntityName }}</strong>
          <span *ngIf="r.propertyName"> — {{ r.propertyName }}</span>
          <span *ngIf="!r.propertyName" class="chain-badge">{{ "access.entireChain" | translate }}</span>
        </li>
      </ul>
      <div *ngIf="!loadingRelationships && relationships.length === 0" class="empty-state">
        {{ "access.none" | translate }}
      </div>
    </div>

    <div class="card">
      <h3>{{ "access.requestNew" | translate }}</h3>
      <div class="request-form">
        <select class="form-control" [(ngModel)]="scope">
          <option value="Property">{{ "access.scopeProperty" | translate }}</option>
          <option value="Chain">{{ "access.scopeChain" | translate }}</option>
        </select>
        <select class="form-control" [(ngModel)]="selectedEntityId" (ngModelChange)="selectedPropertyId = null">
          <option [ngValue]="null">{{ "access.selectChain" | translate }}</option>
          <option *ngFor="let be of buyingEntities" [ngValue]="be.id">{{ be.name }}</option>
        </select>
        <select
          class="form-control"
          *ngIf="scope === 'Property'"
          [(ngModel)]="selectedPropertyId"
          [disabled]="!selectedEntityId"
        >
          <option [ngValue]="null">{{ "access.selectProperty" | translate }}</option>
          <option *ngFor="let p of propertiesFor(selectedEntityId)" [ngValue]="p.id">{{ p.name }}</option>
        </select>
        <button class="btn btn-primary" [disabled]="!canSubmit() || submitting" (click)="submitRequest()">
          {{ submitting ? ("access.submitting" | translate) : ("access.submit" | translate) }}
        </button>
      </div>
      <p *ngIf="submitError" class="field-error" role="alert">{{ submitError }}</p>
    </div>

    <div class="card">
      <h3>{{ "access.history" | translate }}</h3>
      <table class="data-table" *ngIf="requests.length > 0">
        <thead>
          <tr>
            <th>{{ "access.colScope" | translate }}</th>
            <th>{{ "access.colStatus" | translate }}</th>
            <th>{{ "access.colDate" | translate }}</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let r of requests">
            <td>{{ r.buyingEntityName }}{{ r.propertyName ? " / " + r.propertyName : "" }}</td>
            <td><span class="badge" [ngClass]="'badge-' + r.status.toLowerCase()">{{ r.status }}</span></td>
            <td>{{ r.requestedDate | date: "mediumDate" }}</td>
          </tr>
        </tbody>
      </table>
      <div *ngIf="requests.length === 0" class="empty-state">{{ "access.noRequests" | translate }}</div>
    </div>
  `,
  styles: [
    `
      .page-header { margin-bottom: 20px; }
      .page-header h1 { font-size: 22px; font-weight: 700; color: var(--color-heading); }
      .page-subtitle { font-size: 13px; color: var(--color-text-secondary); margin-top: 4px; max-width: 640px; }
      .card { margin-bottom: 16px; }
      h3 { font-size: 13px; font-weight: 700; margin: 0 0 12px; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.5px; }
      .rel-list { list-style: none; padding: 0; margin: 0; }
      .rel-list li { padding: 8px 0; border-bottom: 1px solid var(--color-border-light); font-size: 13px; }
      .chain-badge { color: var(--color-text-muted); font-size: 12px; }
      .request-form { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
      .request-form .form-control { width: 200px; }
      .loading-state, .empty-state { padding: 8px 0; color: var(--color-text-secondary); font-size: 13px; }
      .badge { padding: 3px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
      .badge-pending { background: var(--color-warning-soft-bg, #fff4e0); color: var(--color-warning-soft-text, #9a6700); }
      .badge-approved { background: var(--color-success-soft-bg, #e6f7ee); color: var(--color-success, #1a7f4e); }
      .badge-rejected { background: var(--color-error-soft-bg, #fde8e8); color: var(--color-error); }
      .field-error { color: var(--color-error); font-size: 12px; margin-top: 8px; }
    `,
  ],
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
