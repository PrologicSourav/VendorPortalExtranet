import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

@Component({
  selector: "app-supplier-accounts",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./supplier-accounts.component.html",
  styleUrl: "./supplier-accounts.component.css",
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
