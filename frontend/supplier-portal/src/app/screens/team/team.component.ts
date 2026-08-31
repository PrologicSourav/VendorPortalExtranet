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
  templateUrl: "./team.component.html",
  styleUrl: "./team.component.css",
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

  changeRole(u: any, newRole: string): void {
    const previous = u.role;
    u.role = newRole;
    this.api.setVendorUserRole(u.id, newRole).subscribe({
      error: () => (u.role = previous),
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
