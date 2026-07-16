import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

@Component({
  selector: "app-supplier-accounts",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header">
      <h1>Supplier Accounts</h1>
      <p class="page-subtitle">
        Manage user access for each supplier organization
      </p>
    </div>

    <!-- Search -->
    <div class="search-bar">
      <input
        type="text"
        class="form-control"
        placeholder="Search supplier..."
        [(ngModel)]="searchTerm"
        style="width: 300px"
      />
    </div>

    <!-- Account List -->
    <div
      *ngFor="let account of filteredAccounts"
      class="card"
      style="margin-top: 12px"
    >
      <div class="card-header">
        {{ account.supplier }}
        <span class="badge badge-success" style="margin-left: 8px"
          >{{ account.users.length }} users</span
        >
      </div>
      <div class="card-body">
        <div class="users-grid">
          <div *ngFor="let user of account.users" class="user-row">
            <div class="user-avatar">{{ user.name.charAt(0) }}</div>
            <div class="user-info">
              <div class="user-name">{{ user.name }}</div>
              <div class="user-email">{{ user.email }}</div>
            </div>
            <div class="user-role">
              <select
                class="form-control"
                [ngModel]="user.role"
                (ngModelChange)="user.role = $event"
                style="width: 150px; padding: 4px 8px; font-size: 12px"
              >
                <option value="Vendor Admin">Vendor Admin</option>
                <option value="Vendor User">Vendor User</option>
                <option value="Vendor Finance">Vendor Finance</option>
              </select>
            </div>
            <div class="user-status">
              <span
                class="badge"
                [ngClass]="
                  user.status === 'Active' ? 'badge-success' : 'badge-muted'
                "
                >{{ user.status }}</span
              >
            </div>
            <div class="user-actions">
              <button class="btn btn-sm" (click)="toggleUserStatus(user)">
                {{ user.status === "Active" ? "Disable" : "Enable" }}
              </button>
              <button
                class="btn btn-sm"
                style="color: var(--color-error)"
                (click)="removeUser(account, user)"
              >
                Remove
              </button>
            </div>
          </div>
        </div>

        <!-- Add User -->
        <div class="add-user-row">
          <input
            type="text"
            class="form-control"
            placeholder="Email"
            [(ngModel)]="newUserEmail"
            style="width: 220px"
          />
          <input
            type="text"
            class="form-control"
            placeholder="Name"
            [(ngModel)]="newUserName"
            style="width: 180px"
          />
          <select
            class="form-control"
            [(ngModel)]="newUserRole"
            style="width: 150px"
          >
            <option value="Vendor User">Vendor User</option>
            <option value="Vendor Admin">Vendor Admin</option>
            <option value="Vendor Finance">Vendor Finance</option>
          </select>
          <button
            class="btn btn-primary btn-sm"
            (click)="addUser(account)"
            [disabled]="!newUserEmail || !newUserName"
          >
            + Add
          </button>
        </div>
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
      }
      .search-bar {
        margin-bottom: 16px;
      }

      .users-grid {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .user-row {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 10px 0;
        border-bottom: 1px solid var(--color-border-light);
        &:last-child {
          border-bottom: none;
        }
      }
      .user-avatar {
        width: 36px;
        height: 36px;
        background: var(--color-primary);
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        font-weight: 600;
        flex-shrink: 0;
      }
      .user-info {
        flex: 1;
      }
      .user-name {
        font-size: 13px;
        font-weight: 600;
      }
      .user-email {
        font-size: 12px;
        color: var(--color-text-muted);
      }
      .user-actions {
        display: flex;
        gap: 6px;
      }

      .add-user-row {
        display: flex;
        gap: 10px;
        align-items: center;
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid var(--color-border-light);
      }
    `,
  ],
})
export class SupplierAccountsComponent {
  searchTerm = "";
  newUserEmail = "";
  newUserName = "";
  newUserRole = "Vendor User";
  toast: any = null;

  accounts = [
    {
      supplier: "Mumbai Fresh Foods",
      users: [
        {
          name: "Rajesh Kumar",
          email: "rajesh@mumbaifreshfoods.com",
          role: "Vendor Admin",
          status: "Active",
        },
        {
          name: "Priya Mehta",
          email: "priya@mumbaifreshfoods.com",
          role: "Vendor User",
          status: "Active",
        },
        {
          name: "Anil Desai",
          email: "anil@mumbaifreshfoods.com",
          role: "Vendor Finance",
          status: "Active",
        },
      ],
    },
    {
      supplier: "Green Valley Farms",
      users: [
        {
          name: "Priya Nair",
          email: "priya@greenvalleyfarms.com",
          role: "Vendor Admin",
          status: "Active",
        },
        {
          name: "Suresh Babu",
          email: "suresh@greenvalleyfarms.com",
          role: "Vendor User",
          status: "Inactive",
        },
      ],
    },
    {
      supplier: "Delhi Spice Traders",
      users: [
        {
          name: "Amit Sharma",
          email: "amit@delhispice.com",
          role: "Vendor Admin",
          status: "Active",
        },
      ],
    },
  ];

  get filteredAccounts() {
    return this.accounts.filter(
      (a) =>
        !this.searchTerm ||
        a.supplier.toLowerCase().includes(this.searchTerm.toLowerCase()),
    );
  }

  toggleUserStatus(user: any) {
    user.status = user.status === "Active" ? "Inactive" : "Active";
    this.showToast("success", `User ${user.name} ${user.status.toLowerCase()}`);
  }

  removeUser(account: any, user: any) {
    account.users = account.users.filter((u: any) => u !== user);
    this.showToast(
      "success",
      `User ${user.name} removed from ${account.supplier}`,
    );
  }

  addUser(account: any) {
    account.users.push({
      name: this.newUserName,
      email: this.newUserEmail,
      role: this.newUserRole,
      status: "Active",
    });
    this.newUserEmail = "";
    this.newUserName = "";
    this.newUserRole = "Vendor User";
    this.showToast("success", "User added successfully");
  }

  showToast(type: string, message: string) {
    this.toast = { type, message };
    setTimeout(() => (this.toast = null), 3000);
  }
}
