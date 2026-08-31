import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { UnmappedVendorsComponent } from "../unmapped-vendors/unmapped-vendors.component";
import { VendorRelationshipsComponent } from "../vendor-relationships/vendor-relationships.component";

@Component({
  selector: "app-vendor-mapping",
  standalone: true,
  imports: [CommonModule, UnmappedVendorsComponent, VendorRelationshipsComponent],
  templateUrl: "./vendor-mapping.component.html",
  styleUrl: "./vendor-mapping.component.css",
})
export class VendorMappingComponent {
  tab: "unmapped" | "relationships" = "unmapped";
}
