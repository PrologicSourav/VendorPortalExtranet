import { Component, inject, OnDestroy, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router } from "@angular/router";
import { TranslatePipe } from "@ngx-translate/core";
import { forkJoin, interval, Subject, takeUntil } from "rxjs";
import { MOCK_DASHBOARD } from "../../services/mock-data";
import { NotificationService } from "../../services/notification.service";
import { ApiService } from "../../services/api.service";
import { AuthService } from "../../services/auth.service";
import { MoneyPipe } from "../../pipes/money.pipe";

const CATALOGUE_APPROVALS_REFRESH_MS = 30000;

@Component({
  selector: "app-dashboard",
  standalone: true,
  imports: [CommonModule, TranslatePipe, MoneyPipe],
  templateUrl: "./dashboard.component.html",
  styleUrl: "./dashboard.component.css",
})
export class DashboardComponent implements OnInit, OnDestroy {
  private notifService = inject(NotificationService);
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private destroy$ = new Subject<void>();

  data = MOCK_DASHBOARD;
  catalogueApprovalsCount: number | null = null;
  poToAcknowledgeCount: number | null = null;
  invoicesInProgressCount: number | null = null;
  outstandingAmount: number | null = null;
  nextScheduledPayment: { amount: number; date: string } | null = null;

  get notifications() {
    return this.notifService.items();
  }

  pendingPOs: {
    number: string;
    propertyId: string;
    value: number;
    date: string;
  }[] = [];

  constructor(public router: Router) {}

  ngOnInit(): void {
    this.loadPendingPOs();
    this.loadCatalogueApprovalsCount();
    this.loadInvoicesInProgressCount();
    this.loadScheduledPayments();
    interval(CATALOGUE_APPROVALS_REFRESH_MS)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadCatalogueApprovalsCount());
  }

  private loadPendingPOs(): void {
    const vendorId = this.auth.user()?.vendorId;
    if (!vendorId) return;

    this.api.getPurchaseOrders(vendorId, "New").subscribe({
      next: (res: any) => {
        this.pendingPOs = (res.items ?? []).slice(0, 5).map((po: any) => ({
          number: po.wishPoNumber ?? po.poNumber,
          propertyId: po.wishPropertyId ?? po.propertyName ?? "",
          value: po.displayValue ?? po.totalValue,
          date: po.orderDate,
        }));
        this.poToAcknowledgeCount = res.total ?? this.pendingPOs.length;
      },
      error: () => {
        // Keep whatever was last loaded rather than showing a wrong empty state.
      },
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadInvoicesInProgressCount(): void {
    const vendorId = this.auth.user()?.vendorId;
    if (!vendorId) return;

    // "In progress" spans both statuses that haven't reached a resolution yet —
    // matches the tile's own subtitle ("Submitted, pending review").
    forkJoin({
      submitted: this.api.getInvoices(vendorId, "Submitted"),
      underReview: this.api.getInvoices(vendorId, "UnderReview"),
    }).subscribe({
      next: ({ submitted, underReview }: any) => {
        this.invoicesInProgressCount = (submitted.total ?? 0) + (underReview.total ?? 0);
      },
      error: () => {
        // Keep the last known count on error rather than showing a wrong zero.
      },
    });
  }

  private loadScheduledPayments(): void {
    const vendorId = this.auth.user()?.vendorId;
    if (!vendorId) return;

    // Outstanding Amount = total of everything scheduled but not yet paid.
    // Next Scheduled Payment = the soonest of those by date.
    this.api.getPayments(vendorId, "Scheduled").subscribe({
      next: (payments: any[]) => {
        const items = payments ?? [];
        this.outstandingAmount = items.reduce((sum, p) => sum + (p.amount ?? 0), 0);

        const sorted = [...items].sort(
          (a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime(),
        );
        this.nextScheduledPayment = sorted[0]
          ? { amount: sorted[0].amount, date: sorted[0].scheduledDate }
          : null;
      },
      error: () => {
        // Keep whatever was last loaded rather than showing a wrong zero.
      },
    });
  }

  private loadCatalogueApprovalsCount(): void {
    const vendorId = this.auth.user()?.vendorId;
    if (!vendorId) return;

    this.api.getCatalogues(vendorId, "Submitted").subscribe({
      next: (catalogues: any[]) => {
        this.catalogueApprovalsCount = catalogues.length;
      },
      error: () => {
        // Keep the last known count on error rather than showing a wrong zero.
      },
    });
  }

  getNotifIcon(type: string): string {
    const icons: Record<string, string> = {
      po: "📋",
      rejected: "❌",
      payment: "💰",
      catalogue: "📦",
    };
    return icons[type] || "📌";
  }
}
