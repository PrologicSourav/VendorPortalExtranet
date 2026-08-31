import { Component, inject, OnDestroy, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router } from "@angular/router";
import { TranslatePipe } from "@ngx-translate/core";
import { interval, Subject, takeUntil } from "rxjs";
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

  get notifications() {
    return this.notifService.items();
  }

  pendingPOs = [
    {
      number: "PO-20250701-001",
      property: "Sofitel Delhi",
      value: 84000,
      date: "Jul 1, 2025",
    },
    {
      number: "PO-20250703-003",
      property: "Sofitel Delhi",
      value: 28000,
      date: "Jul 3, 2025",
    },
  ];

  constructor(public router: Router) {}

  ngOnInit(): void {
    this.loadCatalogueApprovalsCount();
    interval(CATALOGUE_APPROVALS_REFRESH_MS)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadCatalogueApprovalsCount());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
