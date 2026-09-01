import { Component, effect, inject, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router, RouterModule } from "@angular/router";
import { TranslatePipe } from "@ngx-translate/core";
import { MoneyPipe } from "../../pipes/money.pipe";
import { ApiService } from "../../services/api.service";
import { AuthService } from "../../services/auth.service";
import { PropertyContextService } from "../../services/property-context.service";

@Component({
  selector: "app-purchase-orders",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslatePipe, MoneyPipe],
  templateUrl: "./purchase-orders.component.html",
  styleUrl: "./purchase-orders.component.css",
})
export class PurchaseOrdersComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private propertyCtx = inject(PropertyContextService);

  searchTerm = "";
  statusFilter = "";
  selectedPO: any = null;
  showPartialDialog = false;
  showUnableDialog = false;
  acceptedQtys: number[] = [];
  acceptReasons: string[] = [];
  unableReason = "";
  toast: any = null;

  loading = false;
  loadError: string | null = null;
  busy = false;
  loadingDocument = false;
  pos: any[] = [];

  filters = [
    { label: "purchaseOrders.filterAll", value: "" },
    { label: "purchaseOrders.filterNew", value: "New" },
    { label: "purchaseOrders.filterAcknowledged", value: "Acknowledged" },
    { label: "purchaseOrders.filterDelivered", value: "Delivered" },
  ];

  get vendorId(): string | null {
    return this.auth.user()?.vendorId ?? null;
  }
  get hasVendor(): boolean {
    return !!this.vendorId;
  }

  constructor() {
    // Re-load whenever the topbar property switcher changes (including the initial
    // value), so "one property selected" immediately scopes the PO list to it.
    effect(() => {
      this.propertyCtx.selectedPropertyId();
      this.load();
    });
  }

  ngOnInit(): void {}

  load(): void {
    const vid = this.vendorId;
    if (!vid) return;
    this.loading = true;
    this.loadError = null;
    const propertyId = this.propertyCtx.selectedPropertyId();
    this.api.getPurchaseOrders(vid, undefined, 1, propertyId).subscribe({
      next: (res: any) => {
        const items = res?.items ?? res ?? [];
        this.pos = items.map((p: any) => this.mapPo(p));
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.loadError = this.extractError(err);
      },
    });
  }

  private mapPo(p: any) {
    const topItems = (p.topItems ?? []).map((l: any) => ({
      description: l.itemDescription,
      lineTotal: l.lineTotal,
    }));
    return {
      id: p.id,
      poNumber: p.wishPoNumber ?? p.poNumber,
      entity: p.entityName ?? "—",
      property: p.propertyName ?? "",
      orderDate: p.orderDate,
      requiredBy: p.requiredByDate,
      lines: p.lineCount ?? 0,
      topItems,
      topItemsSummary: topItems.map((t: any) => t.description).join(", "),
      value: p.totalValue,
      status: p.status,
      hasDocument: !!p.hasPrintedDocument,
      documentFileName: p.printedDocumentFileName ?? null,
      lineItems: [] as any[],
    };
  }

  get filteredPOs() {
    return this.pos.filter(
      (po) =>
        (!this.statusFilter || po.status === this.statusFilter) &&
        (!this.searchTerm ||
          po.poNumber.toLowerCase().includes(this.searchTerm.toLowerCase())),
    );
  }

  getStatusBadge(status: string): string {
    const map: Record<string, string> = {
      New: "badge-info",
      Acknowledged: "badge-success",
      Delivered: "badge-muted",
      PartiallyAccepted: "badge-warning",
      UnableToSupply: "badge-error",
    };
    return map[status] || "badge-muted";
  }

  getStatusKey(status: string): string {
    const map: Record<string, string> = {
      New: "purchaseOrders.statusNew",
      Acknowledged: "purchaseOrders.statusAcknowledged",
      Delivered: "purchaseOrders.statusDelivered",
      PartiallyAccepted: "purchaseOrders.statusPartiallyAccepted",
      UnableToSupply: "purchaseOrders.statusUnableToSupply",
    };
    return map[status] || status;
  }

  openDetail(po: any) {
    this.selectedPO = po;
    this.showPartialDialog = false;
    this.showUnableDialog = false;
    // Fetch full detail (incl. line items) for the drawer.
    this.api.getPurchaseOrder(po.id).subscribe({
      next: (d: any) => {
        const lineItems = (d?.lines ?? []).map((l: any) => ({
          id: l.id,
          item: l.itemDescription,
          qty: l.qtyOrdered,
          uom: l.uom,
          unitPrice: l.unitPrice,
          lineTotal: l.lineTotal,
          taxClass: l.taxClass ?? null,
          taxAmount: l.taxAmount ?? 0,
        }));
        this.selectedPO = {
          ...po,
          lineItems,
          taxTotal: d?.taxTotal ?? 0,
          remarks: d?.remarks ?? null,
          dispatchInstructions: d?.dispatchInstructions ?? null,
          packingInstructions: d?.packingInstructions ?? null,
        };
        this.acceptedQtys = lineItems.map((l: any) => l.qty);
        this.acceptReasons = lineItems.map(() => "");
      },
      error: () => {
        this.selectedPO = { ...po, lineItems: [] };
      },
    });
  }

  /** Opens the property's uploaded PO PDF in a new tab. Fetched as a blob (not a
   *  plain link) because the request needs the Bearer auth header. */
  viewDocument(po: any) {
    if (!po?.id || this.loadingDocument) return;
    // Open the tab synchronously, in the same user-gesture the click provides.
    // Opening it later — after the async fetch resolves, inside the subscribe
    // callback — breaks the trusted-gesture chain and most browsers silently
    // block it as an untrusted popup (no error, it just does nothing).
    const newTab = window.open("", "_blank");
    this.loadingDocument = true;
    this.api.getPoDocument(po.id).subscribe({
      next: (blob: Blob) => {
        this.loadingDocument = false;
        const url = URL.createObjectURL(blob);
        if (newTab) {
          newTab.location.href = url;
        } else {
          // The synchronous open itself was blocked — fall back to navigating
          // the current tab so the document is still reachable.
          window.location.href = url;
        }
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      },
      error: () => {
        this.loadingDocument = false;
        newTab?.close();
        this.showToast("error", "purchaseOrders.toastDocumentError");
      },
    });
  }

  acknowledgePo() {
    if (!this.selectedPO || this.busy) return;
    this.busy = true;
    this.api.acknowledgePo(this.selectedPO.id).subscribe({
      next: () => {
        this.onActionDone("Acknowledged", "purchaseOrders.toastAcknowledged");
        setTimeout(() => (this.selectedPO = null), 1200);
      },
      error: (err) => this.onActionError(err),
    });
  }

  confirmPartial() {
    if (!this.selectedPO || this.busy) return;
    this.busy = true;
    const lines = (this.selectedPO.lineItems ?? []).map((l: any, i: number) => ({
      lineId: l.id,
      acceptedQty: this.acceptedQtys[i],
      reason: this.acceptReasons[i] || null,
    }));
    this.api.partialAcceptPo(this.selectedPO.id, lines).subscribe({
      next: () => {
        this.showPartialDialog = false;
        this.onActionDone(
          "PartiallyAccepted",
          "purchaseOrders.toastPartialConfirmed",
        );
      },
      error: (err) => this.onActionError(err),
    });
  }

  confirmUnable() {
    if (!this.selectedPO || this.busy) return;
    this.busy = true;
    this.api
      .unableToSupplyPo(this.selectedPO.id, this.unableReason)
      .subscribe({
        next: () => {
          this.showUnableDialog = false;
          this.onActionDone(
            "UnableToSupply",
            "purchaseOrders.toastUnableRecorded",
          );
        },
        error: (err) => this.onActionError(err),
      });
  }

  private onActionDone(newStatus: string, messageKey: string) {
    this.busy = false;
    if (this.selectedPO) this.selectedPO.status = newStatus;
    // reflect in the list too
    const row = this.pos.find((p) => p.id === this.selectedPO?.id);
    if (row) row.status = newStatus;
    this.showToast("success", messageKey);
  }

  private onActionError(err: any) {
    this.busy = false;
    this.showToast("error", this.extractError(err));
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

  showToast(type: string, message: string) {
    this.toast = { type, message };
    setTimeout(() => (this.toast = null), 3000);
  }
}
