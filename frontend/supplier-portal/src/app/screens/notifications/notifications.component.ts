import { Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { TranslatePipe } from "@ngx-translate/core";
import { NotificationService } from "../../services/notification.service";
import { AmountsToCurrencyPipe } from "../../pipes/amounts-to-currency.pipe";

@Component({
  selector: "app-notifications",
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, AmountsToCurrencyPipe],
  templateUrl: "./notifications.component.html",
  styleUrl: "./notifications.component.css",
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
