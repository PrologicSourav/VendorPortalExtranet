import { Component, inject, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { TranslatePipe } from "@ngx-translate/core";
import { ApiService } from "../../services/api.service";
import { AuthService } from "../../services/auth.service";

@Component({
  selector: "app-team",
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="page-header">
      <h1>{{ "team.title" | translate }}</h1>
      <p class="page-subtitle">{{ "team.subtitle" | translate }}</p>
    </div>

    <div class="card">
      <div class="card-header-row">
        <h3>{{ "team.members" | translate }}</h3>
        <button class="btn btn-primary btn-sm" *ngIf="isAdmin" (click)="showInvite = !showInvite">
          {{ showInvite ? ("team.cancel" | translate) : ("team.invite" | translate) }}
        </button>
      </div>

      <div class="invite-form" *ngIf="showInvite">
        <input type="text" class="form-control" [placeholder]="'team.name' | translate" [(ngModel)]="newName" />
        <input type="email" class="form-control" [placeholder]="'team.email' | translate" [(ngModel)]="newEmail" />
        <select class="form-control" [(ngModel)]="newRole">
          <option value="SupplierOrders">{{ "team.roleOrders" | translate }}</option>
          <option value="SupplierCatalogue">{{ "team.roleCatalogue" | translate }}</option>
          <option value="SupplierFinance">{{ "team.roleFinance" | translate }}</option>
          <option value="SupplierAdmin">{{ "team.roleAdmin" | translate }}</option>
        </select>
        <input type="password" class="form-control" [placeholder]="'team.tempPassword' | translate" [(ngModel)]="newPassword" />
        <button class="btn btn-primary" [disabled]="!canInvite() || inviting" (click)="invite()">
          {{ inviting ? ("team.inviting" | translate) : ("team.addMember" | translate) }}
        </button>
      </div>
      <p *ngIf="inviteError" class="field-error" role="alert">{{ inviteError }}</p>

      <table class="data-table" *ngIf="users.length > 0">
        <thead>
          <tr>
            <th>{{ "team.colName" | translate }}</th>
            <th>{{ "team.colEmail" | translate }}</th>
            <th>{{ "team.colRole" | translate }}</th>
            <th>{{ "team.colStatus" | translate }}</th>
            <th *ngIf="isAdmin"></th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let u of users" [class.selected]="selectedUser?.id === u.id" (click)="selectUser(u)">
            <td>{{ u.displayName }}</td>
            <td>{{ u.email }}</td>
            <td>{{ u.role }}</td>
            <td>
              <span class="badge" [ngClass]="u.isActive ? 'badge-active' : 'badge-inactive'">
                {{ u.isActive ? ("team.active" | translate) : ("team.disabled" | translate) }}
              </span>
            </td>
            <td *ngIf="isAdmin">
              <button
                class="btn btn-sm"
                [ngClass]="u.isActive ? 'btn-danger' : 'btn-primary'"
                (click)="toggleStatus(u); $event.stopPropagation()"
              >
                {{ u.isActive ? ("team.disable" | translate) : ("team.enable" | translate) }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="card" *ngIf="selectedUser && isAdmin">
      <h3>{{ "team.accessFor" | translate }} {{ selectedUser.displayName }}</h3>
      <p class="hint">{{ "team.accessHint" | translate }}</p>

      <div *ngIf="loadingAccess" class="loading-state">{{ "access.loading" | translate }}</div>
      <div *ngIf="!loadingAccess">
        <label class="check-row unrestricted-row">
          <input type="checkbox" [checked]="unrestricted" (change)="setUnrestricted($event)" />
          {{ "team.unrestricted" | translate }}
        </label>

        <div class="rel-checklist" *ngIf="!unrestricted">
          <label class="check-row" *ngFor="let r of relationships">
            <input
              type="checkbox"
              [checked]="grantedIds.has(r.id)"
              (change)="toggleGrant(r.id, $event)"
            />
            {{ r.buyingEntityName }}<span *ngIf="r.propertyName"> — {{ r.propertyName }}</span>
            <span *ngIf="!r.propertyName" class="chain-badge">{{ "access.entireChain" | translate }}</span>
          </label>
        </div>

        <button class="btn btn-primary" [disabled]="savingAccess" (click)="saveAccess()">
          {{ savingAccess ? ("team.saving" | translate) : ("team.saveAccess" | translate) }}
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .page-header { margin-bottom: 20px; }
      .page-header h1 { font-size: 22px; font-weight: 700; color: var(--color-heading); }
      .page-subtitle { font-size: 13px; color: var(--color-text-secondary); margin-top: 4px; max-width: 640px; }
      .card { margin-bottom: 16px; }
      .card-header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
      h3 { font-size: 13px; font-weight: 700; margin: 0; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.5px; }
      .invite-form { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid var(--color-border-light); }
      .invite-form .form-control { width: 180px; }
      tbody tr { cursor: pointer; }
      tbody tr.selected { background: var(--color-surface-active); }
      .badge { padding: 3px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
      .badge-active { background: var(--color-success-soft-bg, #e6f7ee); color: var(--color-success, #1a7f4e); }
      .badge-inactive { background: var(--color-error-soft-bg, #fde8e8); color: var(--color-error); }
      .btn-sm { padding: 4px 10px; font-size: 12px; }
      .field-error { color: var(--color-error); font-size: 12px; margin: 8px 0; }
      .hint { font-size: 12px; color: var(--color-text-secondary); margin: 0 0 12px; }
      .loading-state { padding: 8px 0; color: var(--color-text-secondary); font-size: 13px; }
      .check-row { display: flex; align-items: center; gap: 8px; padding: 8px 0; font-size: 13px; border-bottom: 1px solid var(--color-border-light); cursor: pointer; }
      .unrestricted-row { font-weight: 600; }
      .rel-checklist { margin: 8px 0 16px; padding-left: 12px; }
      .chain-badge { color: var(--color-text-muted); font-size: 12px; }
    `,
  ],
})
export class TeamComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);

  users: any[] = [];
  isAdmin = false;

  showInvite = false;
  newName = "";
  newEmail = "";
  newRole = "SupplierOrders";
  newPassword = "";
  inviting = false;
  inviteError: string | null = null;

  selectedUser: any = null;
  relationships: any[] = [];
  grantedIds = new Set<string>();
  unrestricted = true;
  loadingAccess = false;
  savingAccess = false;

  ngOnInit(): void {
    const currentUser = this.auth.user();
    this.isAdmin = currentUser?.role === "SupplierAdmin";
    const vendorId = currentUser?.vendorId;
    if (!vendorId) return;

    this.api.getVendorUsers(vendorId).subscribe({
      next: (rows) => (this.users = rows ?? []),
      error: () => (this.users = []),
    });

    this.api.getVendorRelationships(vendorId).subscribe({
      next: (rows) => (this.relationships = rows ?? []),
      error: () => (this.relationships = []),
    });
  }

  canInvite(): boolean {
    return !!this.newName && !!this.newEmail && this.newPassword.length >= 6;
  }

  invite(): void {
    const vendorId = this.auth.user()?.vendorId;
    if (!vendorId || !this.canInvite()) return;

    this.inviting = true;
    this.inviteError = null;
    this.api
      .inviteVendorUser(vendorId, {
        email: this.newEmail,
        displayName: this.newName,
        role: this.newRole,
        password: this.newPassword,
      })
      .subscribe({
        next: (created) => {
          this.inviting = false;
          this.showInvite = false;
          this.users = [...this.users, { ...created, isActive: true }];
          this.newName = "";
          this.newEmail = "";
          this.newPassword = "";
        },
        error: (err) => {
          this.inviting = false;
          this.inviteError = err?.error?.error || "Could not add the teammate.";
        },
      });
  }

  toggleStatus(u: any): void {
    this.api.setVendorUserStatus(u.id, !u.isActive).subscribe({
      next: () => (u.isActive = !u.isActive),
    });
  }

  selectUser(u: any): void {
    if (!this.isAdmin) return;
    this.selectedUser = u;
    this.loadingAccess = true;
    this.api.getVendorUserAccess(u.id).subscribe({
      next: (res) => {
        this.unrestricted = res.unrestricted;
        this.grantedIds = new Set(res.grantedRelationshipIds ?? []);
        this.loadingAccess = false;
      },
      error: () => {
        this.unrestricted = true;
        this.grantedIds = new Set();
        this.loadingAccess = false;
      },
    });
  }

  setUnrestricted(event: Event): void {
    this.unrestricted = (event.target as HTMLInputElement).checked;
    if (this.unrestricted) this.grantedIds.clear();
  }

  toggleGrant(relationshipId: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) this.grantedIds.add(relationshipId);
    else this.grantedIds.delete(relationshipId);
  }

  saveAccess(): void {
    if (!this.selectedUser) return;
    this.savingAccess = true;
    const ids = this.unrestricted ? [] : Array.from(this.grantedIds);
    this.api.setVendorUserAccess(this.selectedUser.id, ids).subscribe({
      next: () => (this.savingAccess = false),
      error: () => (this.savingAccess = false),
    });
  }
}
