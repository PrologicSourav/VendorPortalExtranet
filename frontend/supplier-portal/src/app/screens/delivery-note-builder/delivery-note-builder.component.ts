import { Component, inject, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { TranslatePipe, TranslateService } from "@ngx-translate/core";
import { ApiService } from "../../services/api.service";
import { AuthService } from "../../services/auth.service";

@Component({
  selector: "app-delivery-note-builder",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslatePipe],
  templateUrl: "./delivery-note-builder.component.html",
  styleUrl: "./delivery-note-builder.component.css",
})
export class DeliveryNoteBuilderComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private translate = inject(TranslateService);

  poId = "";
  poNumber = "";
  propertyName = "";
  deliveryDate = "";
  timeStart = "";
  timeEnd = "";
  selectedFile = "";
  submitted = false;
  busy = false;
  errorMsg: string | null = null;

  lines: any[] = [];

  ngOnInit(): void {
    this.route.params.subscribe((p) => {
      this.poId = p["poId"];
      if (this.poId) this.loadPo();
    });
  }

  private loadPo(): void {
    this.api.getPurchaseOrder(this.poId).subscribe({
      next: (po: any) => {
        this.poNumber = po?.poNumber ?? "PO-" + this.poId.substring(0, 8);
        this.propertyName = po?.propertyName ?? "";
        this.lines = (po?.lines ?? []).map((l: any) => {
          const remaining = (l.qtyOrdered ?? 0) - (l.qtyDelivered ?? 0);
          return {
            purchaseOrderLineId: l.id,
            item: l.itemDescription,
            orderedQty: l.qtyOrdered,
            deliveredSoFar: l.qtyDelivered ?? 0,
            qtyInDelivery: remaining > 0 ? remaining : 0,
            batchLot: "",
            expiryDate: "",
          };
        });
      },
      error: () => {
        this.errorMsg = this.translate.instant("deliveryNote.loadError");
      },
    });
  }

  onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.selectedFile = input.files[0].name;
    }
  }

  submitDn() {
    if (this.busy || !this.deliveryDate) return;
    const dnLines = this.lines
      .filter((l) => l.qtyInDelivery > 0)
      .map((l) => ({
        purchaseOrderLineId: l.purchaseOrderLineId,
        itemDescription: l.item,
        qtyInDelivery: l.qtyInDelivery,
        batchLotNumber: l.batchLot || null,
        expiryDate: l.expiryDate || null,
      }));
    if (dnLines.length === 0) {
      this.errorMsg = this.translate.instant("deliveryNote.noQtyError");
      return;
    }
    this.busy = true;
    this.errorMsg = null;
    const payload = {
      vendorId: this.auth.user()?.vendorId ?? null,
      purchaseOrderId: this.poId,
      expectedDeliveryDate: this.deliveryDate,
      timeWindowStart: this.timeStart || null,
      timeWindowEnd: this.timeEnd || null,
      lines: dnLines,
    };
    // Create the draft ASN, then submit it as a pending receipt.
    this.api.createDeliveryNote(payload).subscribe({
      next: (created: any) => {
        this.api.submitDeliveryNote(created.id).subscribe({
          next: () => {
            this.busy = false;
            this.submitted = true;
            setTimeout(() => this.router.navigate(["/purchase-orders"]), 1500);
          },
          error: (err) => this.onError(err),
        });
      },
      error: (err) => this.onError(err),
    });
  }

  private onError(err: any) {
    this.busy = false;
    this.errorMsg =
      err?.error?.error?.message ??
      err?.error?.error ??
      err?.error?.message ??
      err?.message ??
      this.translate.instant("deliveryNote.submitError");
  }
}
