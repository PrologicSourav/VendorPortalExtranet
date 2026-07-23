import { Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  Router,
  RouterOutlet,
  RouterLink,
  RouterLinkActive,
} from "@angular/router";
import { TranslatePipe } from "@ngx-translate/core";
import { NotificationService } from "../services/notification.service";
import { AuthService } from "../services/auth.service";
import { ThemeService } from "../services/theme.service";
import { LanguageSelectorComponent } from "../components/language-selector/language-selector.component";
import { CurrencySelectorComponent } from "../components/currency-selector/currency-selector.component";

@Component({
  selector: "app-layout",
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    TranslatePipe,
    LanguageSelectorComponent,
    CurrencySelectorComponent,
  ],
  template: `
    <!-- Top Bar -->
    <header class="topbar">
      <div class="topbar-left">
        <button
          class="hamburger"
          (click)="sidebarOpen = !sidebarOpen"
          aria-label="Toggle menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
        <span class="logo">{{ "app.title" | translate }}</span>
        <span class="divider">|</span>
        <span class="portal-name">{{ "app.portal" | translate }}</span>
        <language-selector></language-selector>
        <currency-selector></currency-selector>
      </div>
      <div class="topbar-right">
        <div class="entity-switcher">
          <span class="entity-label">{{ "app.entity" | translate }}:</span>
          <select class="entity-select">
            <option>Accor — North India</option>
            <option>Accor — South India</option>
            <option>Taj Hotels — West</option>
          </select>
        </div>
        <button
          class="theme-toggle"
          (click)="theme.toggle()"
          [attr.aria-label]="'app.toggleTheme' | translate"
          [title]="'app.toggleTheme' | translate"
        >
          {{ theme.theme() === "dark" ? "☀️" : "🌙" }}
        </button>
        <a routerLink="/notifications" class="notif-bell">
          🔔
          @if (notifService.unreadCount() > 0) {
            <span class="notif-count">{{ notifService.unreadCount() }}</span>
          }
        </a>
        <div class="user-menu" [title]="userEmail">
          <span class="user-avatar">{{ userInitials }}</span>
          <span class="user-name">{{ userName }}</span>
        </div>
      </div>
    </header>

    <!-- Mobile sidebar overlay -->
    <div
      class="sidebar-overlay"
      [class.visible]="sidebarOpen"
      (click)="sidebarOpen = false"
    ></div>

    <div class="shell">
      <!-- Sidebar -->
      <nav class="sidebar" [class.open]="sidebarOpen">
        <a
          routerLink="/dashboard"
          routerLinkActive="active"
          class="nav-item"
          (click)="sidebarOpen = false"
        >
          <span class="nav-icon">📊</span> {{ "nav.dashboard" | translate }}
        </a>
        <a
          routerLink="/catalogue"
          routerLinkActive="active"
          class="nav-item"
          (click)="sidebarOpen = false"
        >
          <span class="nav-icon">📦</span> {{ "nav.catalogue" | translate }}
        </a>
        <a
          routerLink="/purchase-orders"
          routerLinkActive="active"
          class="nav-item"
          (click)="sidebarOpen = false"
        >
          <span class="nav-icon">📋</span>
          {{ "nav.purchaseOrders" | translate }}
        </a>
        <a
          routerLink="/invoices"
          routerLinkActive="active"
          class="nav-item"
          (click)="sidebarOpen = false"
        >
          <span class="nav-icon">🧾</span> {{ "nav.invoices" | translate }}
        </a>
        <a
          routerLink="/account"
          routerLinkActive="active"
          class="nav-item"
          (click)="sidebarOpen = false"
        >
          <span class="nav-icon">🏦</span> {{ "nav.account" | translate }}
        </a>
        <a
          routerLink="/notifications"
          routerLinkActive="active"
          class="nav-item"
          (click)="sidebarOpen = false"
        >
          <span class="nav-icon">🔔</span> {{ "nav.notifications" | translate }}
        </a>
        <div class="nav-divider"></div>
        <a (click)="logout()" class="nav-item logout" style="cursor:pointer">
          <span class="nav-icon">🚪</span> {{ "nav.logout" | translate }}
        </a>
      </nav>

      <!-- Main Content -->
      <main class="main-content">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [
    `
      .hamburger {
        display: none;
        flex-direction: column;
        justify-content: center;
        gap: 4px;
        background: none;
        border: none;
        cursor: pointer;
        padding: 4px;
        width: 32px;
        height: 32px;
      }
      .hamburger span {
        display: block;
        width: 20px;
        height: 2px;
        background: white;
        border-radius: 2px;
        transition: all 0.25s ease;
      }

      .topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 20px;
        height: 56px;
        background: var(--color-primary);
        color: white;
        position: sticky;
        top: 0;
        z-index: 200;
        color-scheme: dark;
      }
      .topbar-left {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .logo {
        font-weight: 700;
        font-size: 16px;
      }
      .divider {
        opacity: 0.3;
      }
      .portal-name {
        font-size: 13px;
        opacity: 0.8;
      }
      .topbar-right {
        display: flex;
        align-items: center;
        gap: 20px;
      }
      .entity-switcher {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .entity-label {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.85);
      }
      .entity-select {
        background: rgba(255, 255, 255, 0.2);
        color: white;
        border: 1px solid rgba(255, 255, 255, 0.35);
        border-radius: 4px;
        padding: 5px 10px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        outline: none;
        appearance: auto;
        -webkit-appearance: auto;
      }
      .entity-select option {
        background: #1b2a4a;
        color: white;
      }
      .theme-toggle {
        background: rgba(255, 255, 255, 0.15);
        border: 1px solid rgba(255, 255, 255, 0.25);
        border-radius: 50%;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 15px;
        line-height: 1;
        cursor: pointer;
        transition: background 0.15s ease;
      }
      .theme-toggle:hover {
        background: rgba(255, 255, 255, 0.28);
      }
      .notif-bell {
        position: relative;
        font-size: 18px;
        text-decoration: none;
      }
      .notif-count {
        position: absolute;
        top: -6px;
        right: -8px;
        background: var(--color-accent);
        color: white;
        font-size: 10px;
        font-weight: 700;
        padding: 1px 5px;
        border-radius: 99px;
      }
      .user-menu {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .user-avatar {
        width: 32px;
        height: 32px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 600;
      }
      .user-name {
        font-size: 13px;
      }

      .sidebar-overlay {
        display: none;
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.4);
        z-index: 299;
        opacity: 0;
        transition: opacity 0.3s ease;
      }
      .sidebar-overlay.visible {
        opacity: 1;
      }

      .shell {
        display: flex;
        min-height: calc(100vh - 56px);
      }

      .sidebar {
        width: 220px;
        background: var(--color-surface);
        border-right: 1px solid var(--color-border);
        padding: 12px 0;
        flex-shrink: 0;
      }
      .nav-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 20px;
        font-size: 13px;
        font-weight: 500;
        color: var(--color-text-secondary);
        text-decoration: none;
        transition: all 0.15s ease;
        border-left: 3px solid transparent;
      }
      .nav-item:hover {
        background: var(--color-surface-alt);
        color: var(--color-text);
      }
      .nav-item.active {
        color: var(--color-heading);
        background: var(--color-surface-active);
        border-left-color: var(--color-primary);
        font-weight: 600;
      }
      .nav-icon {
        font-size: 16px;
      }
      .nav-divider {
        height: 1px;
        background: var(--color-border);
        margin: 12px 0;
      }
      .nav-item.logout {
        color: var(--color-error);
      }

      .main-content {
        flex: 1;
        padding: 24px;
        overflow-y: auto;
        min-width: 0;
      }

      @media (max-width: 1024px) {
        .entity-switcher {
          display: none;
        }
        .user-name {
          display: none;
        }
        .main-content {
          padding: 20px;
        }
      }

      @media (max-width: 768px) {
        .hamburger {
          display: flex;
        }
        .portal-name {
          display: none;
        }
        .divider {
          display: none;
        }
        .topbar-right {
          gap: 12px;
        }
        .topbar {
          padding: 0 12px;
        }
        .topbar-left {
          gap: 8px;
        }

        .sidebar-overlay {
          display: block;
          pointer-events: none;
        }
        .sidebar-overlay.visible {
          pointer-events: auto;
        }

        .sidebar {
          position: fixed;
          top: 56px;
          left: 0;
          bottom: 0;
          z-index: 300;
          transform: translateX(-100%);
          transition: transform 0.3s ease;
          box-shadow: none;
          width: 240px;
        }
        .sidebar.open {
          transform: translateX(0);
          box-shadow: 4px 0 20px rgba(0, 0, 0, 0.15);
        }
        .main-content {
          padding: 16px;
        }
      }

      @media (max-width: 480px) {
        .topbar {
          padding: 0 8px;
        }
        .logo {
          font-size: 14px;
        }
        .topbar-left {
          gap: 6px;
        }
        .topbar-right {
          gap: 8px;
        }
        .user-avatar {
          width: 28px;
          height: 28px;
          font-size: 11px;
        }
      }
    `,
  ],
})
export class LayoutComponent {
  notifService = inject(NotificationService);
  theme = inject(ThemeService);
  private auth = inject(AuthService);
  private router = inject(Router);
  sidebarOpen = false;

  /** Logged-in user's display name (falls back to email). */
  get userName(): string {
    const u = this.auth.user();
    return u?.displayName || u?.email || "";
  }

  get userEmail(): string {
    return this.auth.user()?.email ?? "";
  }

  /** Up to two initials from the display name for the avatar circle. */
  get userInitials(): string {
    const source = this.auth.user()?.displayName || this.auth.user()?.email || "?";
    return source
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }

  logout() {
    this.auth.logout();
    this.router.navigate(["/login"]);
  }
}
