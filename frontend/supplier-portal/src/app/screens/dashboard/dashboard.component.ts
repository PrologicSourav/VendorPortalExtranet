import { Component, inject, OnDestroy, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router } from "@angular/router";
import { TranslatePipe } from "@ngx-translate/core";
import { interval, Subject, takeUntil } from "rxjs";
import { MOCK_DASHBOARD } from "../../services/mock-data";
import { NotificationService } from "../../services/notification.service";
import { ApiService } from "../../services/api.service";
import { AuthService } from "../../services/auth.service";

const CATALOGUE_APPROVALS_REFRESH_MS = 30000;

@Component({
  selector: "app-dashboard",
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <div class="page-header">
      <h1>{{ "dashboard.title" | translate }}</h1>
      <p class="page-subtitle">
        {{ "dashboard.subtitle" | translate }}
      </p>
    </div>

    <!-- KPI Cards -->
    <div class="kpi-grid">
      <div class="kpi-card" style="border-left: 4px solid var(--color-primary)">
        <div class="kpi-label">{{ "dashboard.kpi.poToAcknowledge" | translate }}</div>
        <div class="kpi-value">{{ data.poToAcknowledge }}</div>
        <div class="kpi-sub">{{ "dashboard.kpi.poToAcknowledgeSub" | translate }}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">{{ "dashboard.kpi.invoicesInProgress" | translate }}</div>
        <div class="kpi-value">{{ data.invoicesInProgress }}</div>
        <div class="kpi-sub">{{ "dashboard.kpi.invoicesInProgressSub" | translate }}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">{{ "dashboard.kpi.outstandingAmount" | translate }}</div>
        <div class="kpi-value">₹{{ data.outstandingAmount | number }}</div>
        <div class="kpi-sub">{{ "dashboard.kpi.outstandingAmountSub" | translate }}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">{{ "dashboard.kpi.nextScheduledPayment" | translate }}</div>
        <div class="kpi-value">₹{{ data.nextPayment.amount | number }}</div>
        <div class="kpi-sub">{{ data.nextPayment.date }}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">{{ "dashboard.kpi.cataloguesPendingApproval" | translate }}</div>
        <div class="kpi-value">{{ catalogueApprovalsCount ?? "—" }}</div>
        <div class="kpi-sub">{{ "dashboard.kpi.cataloguesPendingApprovalSub" | translate }}</div>
      </div>
    </div>

    <div class="panels">
      <!-- Action Required -->
      <div class="card panel">
        <div class="card-header">{{ "dashboard.actionRequired.title" | translate }}</div>
        <div class="card-body">
          <div *ngFor="let po of pendingPOs" class="action-item">
            <div class="action-info">
              <span class="po-number">{{ po.number }}</span>
              <span class="po-property">{{ po.property }}</span>
              <span class="po-value">₹{{ po.value | number }}</span>
              <span class="po-date">{{ po.date }}</span>
            </div>
            <button
              class="btn btn-primary"
              (click)="router.navigate(['/purchase-orders'])"
            >
              {{ "dashboard.actionRequired.acknowledge" | translate }}
            </button>
          </div>
          <div *ngIf="pendingPOs.length === 0" class="empty-state">
            <div class="empty-title">{{ "dashboard.actionRequired.emptyTitle" | translate }}</div>
            <div class="empty-desc">
              {{ "dashboard.actionRequired.emptyDesc" | translate }}
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Notifications -->
      <div class="card panel">
        <div class="card-header">{{ "dashboard.recentNotifications.title" | translate }}</div>
        <div class="card-body">
          <div
            *ngFor="let n of notifications"
            class="notif-item"
            [class.unread]="n.unread"
          >
            <span class="notif-icon">{{ getNotifIcon(n.type) }}</span>
            <div class="notif-content">
              <span class="notif-title">{{ n.title }}</span>
              <span class="notif-detail">{{ n.detail }}</span>
            </div>
            <span class="notif-time">{{ n.time }}</span>
          </div>
          <div *ngIf="notifications.length === 0" class="empty-state">
            <div class="empty-title">{{ "dashboard.recentNotifications.emptyTitle" | translate }}</div>
            <div class="empty-desc">{{ "dashboard.recentNotifications.emptyDesc" | translate }}</div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .page-header {
        margin-bottom: 24px;
      }
      .page-header h1 {
        font-size: 22px;
        font-weight: 700;
        color: var(--color-primary);
      }
      .page-subtitle {
        font-size: 13px;
        color: var(--color-text-secondary);
        margin-top: 4px;
      }

      .kpi-grid {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 16px;
        margin-bottom: 24px;
      }
      @media (max-width: 1023px) {
        .kpi-grid {
          grid-template-columns: repeat(2, 1fr);
        }
      }
      @media (max-width: 640px) {
        .kpi-grid {
          grid-template-columns: 1fr;
        }
      }

      /* 5 equal columns get tight right at the 1024px+ boundary — shrink
         label/value sizing there so cards stay short and the page fits
         without a forced vertical scroll on common laptop heights. */
      @media (min-width: 1024px) and (max-width: 1365px) {
        .kpi-card {
          padding: 14px;
        }
        .kpi-label {
          font-size: 10px;
          letter-spacing: 0.2px;
        }
        .kpi-value {
          font-size: 19px;
        }
        .kpi-sub {
          font-size: 11px;
        }
      }

      .panels {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
      }
      @media (max-width: 1023px) {
        .panels {
          grid-template-columns: 1fr;
        }
      }
      .panel {
        min-height: 300px;
      }

      .action-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 0;
        border-bottom: 1px solid var(--color-border-light);
        &:last-child {
          border-bottom: none;
        }
      }
      .action-info {
        display: flex;
        align-items: center;
        gap: 16px;
        flex-wrap: wrap;
      }
      .po-number {
        font-weight: 600;
        font-size: 13px;
      }
      .po-property {
        font-size: 12px;
        color: var(--color-text-secondary);
      }
      .po-value {
        font-size: 13px;
        font-weight: 500;
      }
      .po-date {
        font-size: 11px;
        color: var(--color-text-muted);
      }

      @media (max-width: 640px) {
        .action-item {
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
        }
        .action-info {
          gap: 8px;
        }
      }

      .notif-item {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 12px 0;
        border-bottom: 1px solid var(--color-border-light);
        &:last-child {
          border-bottom: none;
        }
        &.unread {
          background: #f8fafc;
          margin: 0 -20px;
          padding: 12px 20px;
        }
      }
      .notif-icon {
        font-size: 20px;
        flex-shrink: 0;
        margin-top: 2px;
      }
      .notif-content {
        flex: 1;
      }
      .notif-title {
        display: block;
        font-size: 13px;
        font-weight: 600;
      }
      .notif-detail {
        display: block;
        font-size: 12px;
        color: var(--color-text-secondary);
        margin-top: 2px;
      }
      .notif-time {
        font-size: 11px;
        color: var(--color-text-muted);
        white-space: nowrap;
      }

      @media (max-width: 640px) {
        .action-item {
          flex-direction: column;
          align-items: flex-start;
          gap: 10px;
        }
        .action-info {
          flex-wrap: wrap;
          gap: 8px;
        }
        .notif-item {
          padding: 10px 0;
        }
        .notif-time {
          font-size: 10px;
        }
      }
    `,
  ],
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
