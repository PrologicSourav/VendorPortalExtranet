import { Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { NotificationService } from "../../services/notification.service";

@Component({
  selector: "app-notifications",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header">
      <h1>Notifications</h1>
      <p class="page-subtitle">Stay updated on your procurement activities</p>
    </div>

    <!-- Controls -->
    <div class="toolbar">
      <button class="btn btn-secondary" (click)="markAllRead()">
        ✓ Mark all as read
      </button>
      <div class="filter-group">
        <select class="form-control" [(ngModel)]="typeFilter">
          <option value="">All Types</option>
          <option value="po">New PO</option>
          <option value="rejected">Rejected</option>
          <option value="payment">Payment</option>
          <option value="catalogue">Catalogue</option>
        </select>
        <input
          type="text"
          class="form-control"
          placeholder="Search..."
          [(ngModel)]="searchTerm"
        />
      </div>
    </div>

    <!-- Notifications List -->
    <div class="card">
      <div *ngFor="let group of groupedNotifications" class="notif-group">
        <div class="group-header">{{ group.label }}</div>
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
        <div class="empty-title">No notifications</div>
        <div class="empty-desc">You're all caught up.</div>
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
        color: var(--color-primary);
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
          background: #fafbfc;
        }
        &.unread {
          background: #f0f4ff;
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
        background: #dbeafe;
      }
      .icon-rejected {
        background: #fee2e2;
      }
      .icon-payment {
        background: #dcfce7;
      }
      .icon-catalogue {
        background: #e8edf4;
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
        label: "Today",
        items: this.filteredNotifications.filter((n) =>
          n.time.includes("hour"),
        ),
      },
      {
        label: "Earlier",
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
