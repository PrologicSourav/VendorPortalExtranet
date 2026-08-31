import { Component, inject, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute } from "@angular/router";
import { TranslatePipe } from "@ngx-translate/core";
import { MoneyPipe } from "../../pipes/money.pipe";
import { ApiService } from "../../services/api.service";
import { AuthService } from "../../services/auth.service";

@Component({
  selector: "app-invoice-submit",
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, MoneyPipe],
  templateUrl: "./invoice-submit.component.html",
  styleUrl: "./invoice-submit.component.css",
})
export class InvoiceSubmitComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);

  step = 1;
  /** Set when opened via "Attach Invoice" on a specific PO (?poId=...) but that PO
   *  isn't in the invoiceable list — lets the template explain why nothing preselected. */
  preselectedPoNotFound = false;
  selectedPO: any = null;
  invoiceNumber = "";
  invoiceDate = "";
  currency = "INR";
  selectedFile = "";
  submitted = false;

  loading = false;
  busy = false;
  deliveredPOs: any[] = [];
  invoiceLines: any[] = [];

  get vendorId(): string | null {
    return this.auth.user()?.vendorId ?? null;
  }
  get hasVendor(): boolean {
    return !!this.vendorId;
  }

  ngOnInit(): void {
    const vid = this.vendorId;
    if (!vid) return;
    this.loading = true;
    const preselectPoId = this.route.snapshot.queryParamMap.get("poId");
    // Invoiceable POs = those the buyer has acknowledged or received (delivered).
    this.api.getPurchaseOrders(vid).subscribe({
      next: (res: any) => {
        const items = res?.items ?? res ?? [];
        this.deliveredPOs = items
          .filter((p: any) => p.status === "Delivered" || p.status === "Acknowledged")
          .map((p: any) => ({
            id: p.id,
            poNumber: p.poNumber,
            entity: p.entityName ?? "—",
            property: p.propertyName ?? "",
            deliveryDate: p.requiredByDate
              ? new Date(p.requiredByDate).toLocaleDateString()
              : "",
            value: p.totalValue,
          }));
        this.loading = false;

        // Arrived here via "Attach Invoice" on a specific PO — skip straight to it.
        if (preselectPoId) {
          const match = this.deliveredPOs.find((p) => p.id === preselectPoId);
          if (match) {
            this.selectPo(match);
            this.step = 2;
          } else {
            this.preselectedPoNotFound = true;
          }
        }
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  get subtotal(): number {
    return this.invoiceLines.reduce(
      (sum, l) => sum + l.invoicedQty * l.invoicedPrice,
      0,
    );
  }

  get tax(): number {
    return this.subtotal * 0.18;
  }
  get total(): number {
    return this.subtotal + this.tax;
  }

  get mismatchReasons(): { key: string; params: Record<string, unknown> }[] {
    const reasons: { key: string; params: Record<string, unknown> }[] = [];
    for (const line of this.invoiceLines) {
      if (line.invoicedQty > line.expectedQty)
        reasons.push({
          key: "invoiceSubmit.mismatchQtyExceeds",
          params: { item: line.item },
        });
      if (line.invoicedPrice > line.expectedPrice)
        reasons.push({
          key: "invoiceSubmit.mismatchPriceHigher",
          params: {
            item: line.item,
            diff: line.invoicedPrice - line.expectedPrice,
          },
        });
    }
    return reasons;
  }

  get isMatched(): boolean {
    return this.mismatchReasons.length === 0;
  }

  selectPo(po: any) {
    this.selectedPO = po;
    // Pull the PO's line items to prefill expected qty/price for the match.
    this.api.getPurchaseOrder(po.id).subscribe({
      next: (d: any) => {
        this.invoiceLines = (d?.lines ?? []).map((l: any) => ({
          item: l.itemDescription,
          expectedQty: l.qtyOrdered,
          invoicedQty: l.qtyOrdered,
          expectedPrice: l.unitPrice,
          invoicedPrice: l.unitPrice,
        }));
      },
      error: () => {
        this.invoiceLines = [];
      },
    });
  }

  onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) this.selectedFile = input.files[0].name;
  }

  submitInvoice() {
    if (this.busy || !this.selectedPO) return;
    if (!this.invoiceNumber.trim() || !this.invoiceDate) {
      this.showToast("error", "invoiceSubmit.missingFields");
      return;
    }
    this.busy = true;
    const payload = {
      vendorId: this.vendorId,
      purchaseOrderId: this.selectedPO.id,
      invoiceNumber: this.invoiceNumber.trim(),
      invoiceDate: this.invoiceDate,
      currency: this.currency,
      subTotal: this.subtotal,
      taxAmount: this.tax,
      totalAmount: this.total,
      lines: this.invoiceLines.map((l) => ({
        itemDescription: l.item,
        invoicedQty: l.invoicedQty,
        invoicedUnitPrice: l.invoicedPrice,
        expectedQty: l.expectedQty,
        expectedUnitPrice: l.expectedPrice,
        lineTotal: l.invoicedQty * l.invoicedPrice,
      })),
    };
    this.api.createInvoice(payload).subscribe({
      next: (created: any) => {
        this.busy = false;
        // Backend is authoritative on the match outcome.
        const matched = created?.matchStatus === "Matched";
        this.showToast(
          "success",
          matched
            ? "invoiceSubmit.submittedMatched"
            : "invoiceSubmit.submittedMismatch",
        );
      },
      error: (err) => {
        this.busy = false;
        this.showToast("error", this.extractError(err), true);
      },
    });
  }

  // Toast shown at the bottom; `raw` = message is literal text, not a i18n key.
  toast: { type: string; message: string; raw?: boolean } | null = null;
  private showToast(type: string, message: string, raw = false) {
    this.submitted = type === "success";
    this.toast = { type, message, raw };
    setTimeout(() => (this.toast = null), 3500);
  }

  private extractError(err: any): string {
    return (
      err?.error?.error?.message ??
      err?.error?.error ??
      err?.error?.message ??
      err?.message ??
      "Something went wrong. Please try again."
    );
  }
}
