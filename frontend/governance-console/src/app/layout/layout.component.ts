import { Component } from "@angular/core";
import { RouterOutlet, RouterLink, RouterLinkActive } from "@angular/router";

@Component({
  selector: "app-gov-layout",
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <header class="topbar">
      <div class="topbar-left">
        <span class="logo">Web Prol'IFIC</span>
        <span class="divider">|</span>
        <span class="portal-name">Governance Console</span>
      </div>
      <div class="topbar-right">
        <span class="entity-label">Prologic First</span>
        <div class="user-menu">
          <span class="user-avatar">SG</span>
          <span class="user-name">Sachin Gupta</span>
        </div>
      </div>
    </header>

    <div class="shell">
      <nav class="sidebar">
        <div class="nav-section-title">Supplier Management</div>
        <a routerLink="/kyc-review" routerLinkActive="active" class="nav-item">
          <span class="nav-icon">🔒</span> KYC Review
        </a>
        <a
          routerLink="/kyc-change-approvals"
          routerLinkActive="active"
          class="nav-item"
        >
          <span class="nav-icon">🔄</span> KYC Change Approvals
        </a>
        <a
          routerLink="/supplier-accounts"
          routerLinkActive="active"
          class="nav-item"
        >
          <span class="nav-icon">👥</span> Supplier Accounts
        </a>

        <div class="nav-section-title">Deduplication</div>
        <a
          routerLink="/vendor-dedup"
          routerLinkActive="active"
          class="nav-item"
        >
          <span class="nav-icon">🏢</span> Vendor Dedup
        </a>
        <a routerLink="/item-dedup" routerLinkActive="active" class="nav-item">
          <span class="nav-icon">📦</span> Item Dedup
        </a>

        <div class="nav-section-title">Workflows</div>
        <a
          routerLink="/supplier-submissions"
          routerLinkActive="active"
          class="nav-item"
        >
          <span class="nav-icon">📝</span> Supplier Submissions
        </a>
        <a
          routerLink="/catalogue-approvals"
          routerLinkActive="active"
          class="nav-item"
        >
          <span class="nav-icon">✅</span> Catalogue Approvals
        </a>
      </nav>

      <main class="main-content">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [
    `
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
        z-index: 100;
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
      .entity-label {
        font-size: 12px;
        opacity: 0.7;
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

      .shell {
        display: flex;
        min-height: calc(100vh - 56px);
      }

      .sidebar {
        width: 240px;
        background: white;
        border-right: 1px solid var(--color-border);
        padding: 16px 0;
        flex-shrink: 0;
      }
      .nav-section-title {
        padding: 8px 20px 4px;
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        color: var(--color-text-muted);
      }
      .nav-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 9px 20px;
        font-size: 13px;
        font-weight: 500;
        color: var(--color-text-secondary);
        text-decoration: none;
        transition: all 0.15s ease;
        border-left: 3px solid transparent;
        &:hover {
          background: var(--color-surface-alt);
          color: var(--color-text);
        }
        &.active {
          color: var(--color-primary);
          background: #eef2ff;
          border-left-color: var(--color-primary);
          font-weight: 600;
        }
      }
      .nav-icon {
        font-size: 16px;
      }

      .main-content {
        flex: 1;
        padding: 24px;
        overflow-y: auto;
      }
    `,
  ],
})
export class LayoutComponent {}
