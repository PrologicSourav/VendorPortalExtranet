import { Routes } from "@angular/router";
import { LayoutComponent } from "./layout/layout.component";
import { KycReviewComponent } from "./screens/kyc-review/kyc-review.component";
import { KycChangeApprovalsComponent } from "./screens/kyc-change-approvals/kyc-change-approvals.component";
import { VendorDedupComponent } from "./screens/vendor-dedup/vendor-dedup.component";
import { ItemDedupComponent } from "./screens/item-dedup/item-dedup.component";
import { SupplierSubmissionsComponent } from "./screens/supplier-submissions/supplier-submissions.component";
import { CatalogueApprovalsComponent } from "./screens/catalogue-approvals/catalogue-approvals.component";
import { SupplierAccountsComponent } from "./screens/supplier-accounts/supplier-accounts.component";
import { PoDocumentsComponent } from "./screens/po-documents/po-documents.component";
import { DeliveryNoteReceivingComponent } from "./screens/delivery-note-receiving/delivery-note-receiving.component";
import { WishMappingComponent } from "./screens/wish-mapping/wish-mapping.component";
import { VendorRelationshipsComponent } from "./screens/vendor-relationships/vendor-relationships.component";
import { VendorRequestsComponent } from "./screens/vendor-requests/vendor-requests.component";

export const routes: Routes = [
  { path: "", redirectTo: "kyc-review", pathMatch: "full" },
  {
    path: "",
    component: LayoutComponent,
    children: [
      { path: "kyc-review", component: KycReviewComponent },
      { path: "kyc-change-approvals", component: KycChangeApprovalsComponent },
      { path: "vendor-dedup", component: VendorDedupComponent },
      { path: "item-dedup", component: ItemDedupComponent },
      { path: "supplier-submissions", component: SupplierSubmissionsComponent },
      { path: "catalogue-approvals", component: CatalogueApprovalsComponent },
      { path: "po-documents", component: PoDocumentsComponent },
      { path: "delivery-note-receiving", component: DeliveryNoteReceivingComponent },
      { path: "wish-mapping", component: WishMappingComponent },
      { path: "supplier-accounts", component: SupplierAccountsComponent },
      { path: "vendor-relationships", component: VendorRelationshipsComponent },
      { path: "vendor-requests", component: VendorRequestsComponent },
    ],
  },
];
