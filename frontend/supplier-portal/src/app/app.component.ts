import { Component, inject, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from "@angular/router";
import { TranslateService, TranslatePipe } from "@ngx-translate/core";
import { LanguageSelectorComponent } from "./components/language-selector/language-selector.component";
import { CurrencySelectorComponent } from "./components/currency-selector/currency-selector.component";

@Component({
  selector: "app-root",
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
    <div class="app-shell" [class.rtl]="isRtl">
      <header class="topbar">
        <div class="topbar-left">
          <span class="logo">{{ "app.title" | translate }}</span>
          <span class="divider">|</span>
          <span class="portal-name">{{ "app.portal" | translate }}</span>
          <language-selector></language-selector>
          <currency-selector></currency-selector>
        </div>
      </header>

      <div class="shell">
        <main class="main-content">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .app-shell.rtl {
        direction: rtl;
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

      .main-content {
        padding: 24px;
      }
    `,
  ],
})
export class AppComponent implements OnInit {
  private translate = inject(TranslateService);

  isRtl = false;

  ngOnInit(): void {
    // RTL detection based on current language
    this.translate.onLangChange.subscribe(() => {
      this.isRtl = this.translate.currentLang() === "ar";
    });
    this.isRtl = this.translate.currentLang() === "ar";
  }
}
