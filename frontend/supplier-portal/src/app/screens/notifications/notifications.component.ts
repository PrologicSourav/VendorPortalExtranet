import { Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { TranslatePipe } from "@ngx-translate/core";
import { NotificationService } from "../../services/notification.service";

@Component({
  selector: "app-notifications",
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="page-header">
      <h1>{{ "notifications.title" | translate }}</h1>
      <p class="page-subtitle">{{ "notifications.subtitle" | translate }}</p>
    </div>

    <!-- Controls -->
    <div class="toolbar">
      <button class="btn btn-secondary" (click)="markAllRead()">
        ✓ {{ "notifications.markAllRead" | translate }}
      </button>
      <div class="filter-group">
        <select class="form-control" [(ngModel)]="typeFilter">
          <option value="">{{ "notifications.filterAllTypes" | translate }}</option>
          <option value="po">{{ "notifications.filterNewPo" | translate }}</option>
          <option value="rejected">{{ "notifications.filterRejected" | translate }}</option>
          <option value="payment">{{ "notifications.filterPayment" | translate }}</option>
          <option value="catalogue">{{ "notifications.filterCatalogue" | translate }}</option>
        </select>
        <input
          type="text"
          class="form-control"
          [placeholder]="'notifications.searchPlaceholder' | translate"
          [(ngModel)]="searchTerm"
        />
      </div>
    </div>

    <!-- Notifications List -->
    <div class="card">
      <div *ngFor="let group of groupedNotifications" class="notif-group">
        <div class="group-header">{{ group.label | translate }}</div>
        <div
          *ngFor="let n of group.items"
          class="notif-item"
          [class.unread]="n.unread"
          (click)="onNotificationClick(n)"
          role="button"
        >
          <span class="notif-icon" [ngClass]="'icon-' + n.type">{{
            getIcon(n.type)
          }}</span>
          <div class="notif-body">
            <div class="notif-title">{{ n.title }}</div>
            <div class="notif-detail">{{ n.detail }}</div>
          </div>
          <span class="notif-time">{{ n.time }}</span>
          <span *ngIf="n.unread" class="unread-dot"></span>
        </div>
      </div>

      <div *ngIf="filteredNotifications.length === 0" class="empty-state">
        <div class="empty-icon">🔔</div>
        <div class="empty-title">{{ "notifications.emptyTitle" | translate }}</div>
        <div class="empty-desc">{{ "notifications.emptyDesc" | translate }}</div>
      </div>
    </div>
  `,
  styles: [
    `
      .page-header {
        margin-bottom: 20px;
      }
      .page-header h1 {
        font-size: 22px;
        font-weight: 700;
        color: var(--color-heading);
      }
      .page-subtitle {
        font-size: 13px;
        color: var(--color-text-secondary);
        margin-top: 4px;
      }
      .toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }
      .filter-group {
        display: flex;
        gap: 8px;
      }
      .filter-group select {
        width: 140px;
      }
      .filter-group input {
        width: 200px;
      }

      .group-header {
        padding: 10px 20px;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: var(--color-text-muted);
        background: var(--color-surface-alt);
        border-bottom: 1px solid var(--color-border-light);
      }
      .notif-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px 20px;
        border-bottom: 1px solid var(--color-border-light);
        position: relative;
        cursor: pointer;
        transition: background 0.15s;
        &:hover {
          background: var(--color-surface-hover);
        }
        &.unread {
          background: var(--color-surface-active);
        }
      }
      .notif-icon {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        flex-shrink: 0;
      }
      .icon-po {
        background: var(--color-info-soft-bg);
      }
      .icon-rejected {
        background: var(--color-error-soft-bg);
      }
      .icon-payment {
        background: var(--color-success-soft-bg);
      }
      .icon-catalogue {
        background: var(--color-navy-soft-bg);
      }
      .notif-body {
        flex: 1;
      }
      .notif-title {
        font-size: 13px;
        font-weight: 600;
      }
      .notif-detail {
        font-size: 12px;
        color: var(--color-text-secondary);
        margin-top: 2px;
      }
      .notif-time {
        font-size: 11px;
        color: var(--color-text-muted);
        white-space: nowrap;
      }
      .unread-dot {
        width: 8px;
        height: 8px;
        background: var(--color-info);
        border-radius: 50%;
        flex-shrink: 0;
      }

      @media (max-width: 768px) {
        .toolbar {
          flex-direction: column;
          align-items: stretch;
          gap: 10px;
        }
        .filter-group {
          flex-wrap: wrap;
        }
        .filter-group select {
          flex: 1;
          min-width: 100px;
          width: auto;
        }
        .filter-group input {
          flex: 1;
          min-width: 100px;
          width: auto;
        }
        .notif-item {
          padding: 12px 16px;
        }
        .notif-time {
          display: none;
        }
      }

      @media (max-width: 640px) {
        .filter-group select,
        .filter-group input {
          width: 100% !important;
        }
      }
    `,
  ],
})
export class NotificationsComponent {
  private notifService = inject(NotificationService);
  typeFilter = "";
  searchTerm = "";

  get notifications() {
    return this.notifService.items();
  }

  get filteredNotifications() {
    return this.notifications.filter(
      (n) =>
        (!this.typeFilter || n.type === this.typeFilter) &&
        (!this.searchTerm ||
          n.title.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
          n.detail.toLowerCase().includes(this.searchTerm.toLowerCase())),
    );
  }

  get groupedNotifications() {
    return [
      {
        label: "notifications.groupToday",
        items: this.filteredNotifications.filter((n) =>
          n.time.includes("hour"),
        ),
      },
      {
        label: "notifications.groupEarlier",
        items: this.filteredNotifications.filter(
          (n) => !n.time.includes("hour"),
        ),
      },
    ].filter((g) => g.items.length > 0);
  }

  getIcon(type: string): string {
    const icons: Record<string, string> = {
      po: "📋",
      rejected: "❌",
      payment: "💰",
      catalogue: "📦",
    };
    return icons[type] || "📌";
  }

  markAllRead() {
    this.notifService.markAllRead();
  }

  onNotificationClick(n: { id: string; unread: boolean }) {
    if (n.unread) {
      this.notifService.markAsRead(n.id);
    }
  }
}
