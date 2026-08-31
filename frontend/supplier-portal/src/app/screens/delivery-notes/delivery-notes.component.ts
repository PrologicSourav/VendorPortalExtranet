import { Component, OnInit, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
import { TranslatePipe } from "@ngx-translate/core";
import { ApiService } from "../../services/api.service";
import { AuthService } from "../../services/auth.service";

/**
 * Landing screen for the Delivery Note (ASN) menu item: lists the vendor's
 * acknowledged POs so a delivery note can be raised against one. The builder
 * itself lives at /purchase-orders/:poId/delivery-note.
 */
@Component({
  selector: "app-delivery-notes",
  standalone: true,
  imports: [CommonModule, RouterModule, TranslatePipe],
  templateUrl: "./delivery-notes.component.html",
  styleUrl: "./delivery-notes.component.css",
})
export class DeliveryNotesComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);

  pos: any[] = [];
  loading = false;

  get hasVendor(): boolean {
    return !!this.auth.user()?.vendorId;
  }

  ngOnInit(): void {
    const vid = this.auth.user()?.vendorId;
    if (!vid) return;
    this.loading = true;
    this.api.getPurchaseOrders(vid).subscribe({
      next: (res: any) => {
        const items = res?.items ?? res ?? [];
        // Acknowledged POs are the ones a delivery note can be raised against.
        this.pos = items
          .filter((p: any) => p.status === "Acknowledged")
          .map((p: any) => ({
            id: p.id,
            poNumber: p.poNumber,
            entity: p.entityName ?? "—",
            requiredBy: p.requiredByDate,
            status: p.status,
          }));
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }
}
