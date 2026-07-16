import { Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router } from "@angular/router";
import { MOCK_DASHBOARD } from "../../services/mock-data";
import { NotificationService } from "../../services/notification.service";

@Component({
  selector: "app-dashboard",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-header">
      <h1>Dashboard</h1>
      <p class="page-subtitle">
        Welcome back — here's your procurement overview
      </p>
    </div>

    <!-- KPI Cards -->
    <div class="kpi-grid">
      <div class="kpi-card" style="border-left: 4px solid var(--color-primary)">
        <div class="kpi-label">POs to Acknowledge</div>
        <div class="kpi-value">{{ data.poToAcknowledge }}</div>
        <div class="kpi-sub">Awaiting your action</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Invoices in Progress</div>
        <div class="kpi-value">{{ data.invoicesInProgress }}</div>
        <div class="kpi-sub">Submitted, pending review</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Outstanding Amount</div>
        <div class="kpi-value">₹{{ data.outstandingAmount | number }}</div>
        <div class="kpi-sub">Across all entities</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Next Scheduled Payment</div>
        <div class="kpi-value">₹{{ data.nextPayment.amount | number }}</div>
        <div class="kpi-sub">{{ data.nextPayment.date }}</div>
      </div>
    </div>

    <div class="panels">
      <!-- Action Required -->
      <div class="card panel">
        <div class="card-header">Action Required</div>
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
              Acknowledge
            </button>
          </div>
          <div *ngIf="pendingPOs.length === 0" class="empty-state">
            <div class="empty-title">All caught up!</div>
            <div class="empty-desc">
              No POs require your attention right now.
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Notifications -->
      <div class="card panel">
        <div class="card-header">Recent Notifications</div>
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
            <div class="empty-title">No notifications</div>
            <div class="empty-desc">You're all caught up.</div>
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
        grid-template-columns: repeat(4, 1fr);
        gap: 16px;
        margin-bottom: 24px;
      }
      @media (max-width: 1024px) {
        .kpi-grid {
          grid-template-columns: repeat(2, 1fr);
        }
      }

      .panels {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
      }
      @media (max-width: 1024px) {
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
    `,
  ],
})
export class DashboardComponent {
  private notifService = inject(NotificationService);
  data = MOCK_DASHBOARD;
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
