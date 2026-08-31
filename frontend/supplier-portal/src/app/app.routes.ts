import { Routes } from "@angular/router";
import { authGuard, loginGuard } from "./guards/auth.guard";
import { LoginComponent } from "./screens/login/login.component";
import { DashboardComponent } from "./screens/dashboard/dashboard.component";
import { CatalogueComponent } from "./screens/catalogue/catalogue.component";
import { PurchaseOrdersComponent } from "./screens/purchase-orders/purchase-orders.component";
import { DeliveryNoteBuilderComponent } from "./screens/delivery-note-builder/delivery-note-builder.component";
import { DeliveryNotesComponent } from "./screens/delivery-notes/delivery-notes.component";
import { InvoiceSubmitComponent } from "./screens/invoice-submit/invoice-submit.component";
import { AccountComponent } from "./screens/account/account.component";
import { NotificationsComponent } from "./screens/notifications/notifications.component";
import { AccessRequestsComponent } from "./screens/access-requests/access-requests.component";
import { TeamComponent } from "./screens/team/team.component";
import { LayoutComponent } from "./layout/layout.component";

export const routes: Routes = [
  { path: "login", component: LoginComponent, canActivate: [loginGuard] },
  {
    path: "",
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: "dashboard", component: DashboardComponent },
      { path: "catalogue", component: CatalogueComponent },
      { path: "purchase-orders", component: PurchaseOrdersComponent },
      { path: "delivery-notes", component: DeliveryNotesComponent },
      {
        path: "purchase-orders/:poId/delivery-note",
        component: DeliveryNoteBuilderComponent,
      },
      { path: "invoices", component: InvoiceSubmitComponent },
      { path: "account", component: AccountComponent },
      { path: "notifications", component: NotificationsComponent },
      { path: "access-requests", component: AccessRequestsComponent },
      { path: "team", component: TeamComponent },
      { path: "", redirectTo: "dashboard", pathMatch: "full" },
    ],
  },
  { path: "**", redirectTo: "login" },
];
