import { Injectable, inject, signal, computed, effect } from "@angular/core";
import { ApiService } from "./api.service";
import { AuthService } from "./auth.service";

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  detail: string;
  time: string;
  unread: boolean;
  targetScreen?: string;
  targetId?: string;
}

/** Map backend NotificationType enum int → frontend string key */
const TYPE_MAP: Record<number, string> = {
  0: "po",
  1: "rejected",
  2: "payment",
  3: "catalogue",
};

function mapBackendNotification(n: any): AppNotification {
  const created = new Date(n.createdAt);
  const diffMs = Date.now() - created.getTime();
  const diffH = Math.floor(diffMs / 3600000);
  const time =
    diffH < 1
      ? `${Math.max(1, Math.floor(diffMs / 60000))} minutes ago`
      : diffH < 24
        ? `${diffH} hours ago`
        : `${Math.floor(diffH / 24)} days ago`;

  return {
    id: n.id,
    type: TYPE_MAP[n.type] ?? "po",
    title: n.title,
    detail: n.detail ?? "",
    time,
    unread: !n.isRead,
    targetScreen: n.targetScreen ?? undefined,
    targetId: n.targetId ?? undefined,
  };
}

@Injectable({ providedIn: "root" })
export class NotificationService {
  private api = inject(ApiService);
  private auth = inject(AuthService);

  private notifications = signal<AppNotification[]>([]);
  private loading = false;

  readonly items = this.notifications.asReadonly();
  readonly unreadCount = computed(
    () => this.notifications().filter((n) => n.unread).length,
  );

  constructor() {
    // Auto-load whenever userId changes (e.g. after login)
    effect(() => {
      const uid = this.auth.userId();
      if (uid) {
        this.load();
      } else {
        this.notifications.set([]);
      }
    });
  }

  /** Load notifications from the real backend API */
  load(): void {
    const userId = this.auth.userId();
    if (!userId || this.loading) return;
    this.loading = true;

    this.api.getNotifications(userId).subscribe({
      next: (res: any) => {
        const items: AppNotification[] = (res.items ?? []).map(
          mapBackendNotification,
        );
        this.notifications.set(items);
        this.loading = false;
      },
      error: () => {
        // Fallback: keep current state (empty) on error
        this.loading = false;
      },
    });
  }

  /** Mark all notifications as read — calls API then updates local state */
  markAllRead(): void {
    const userId = this.auth.userId();
    if (!userId) return;

    this.api.markAllNotificationsRead(userId).subscribe({
      next: () => {
        this.notifications.update((list) =>
          list.map((n) => ({ ...n, unread: false })),
        );
      },
    });
  }

  /** Mark a single notification as read — calls API then updates local state */
  markAsRead(id: string): void {
    this.api.markNotificationRead(id).subscribe({
      next: () => {
        this.notifications.update((list) =>
          list.map((n) => (n.id === id ? { ...n, unread: false } : n)),
        );
      },
    });
  }
}
