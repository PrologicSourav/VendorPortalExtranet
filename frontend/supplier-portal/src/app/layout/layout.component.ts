import { Component, inject, OnDestroy, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import {
  Router,
  RouterOutlet,
  RouterLink,
  RouterLinkActive,
} from "@angular/router";
import { TranslatePipe, TranslateService } from "@ngx-translate/core";
import { NotificationService } from "../services/notification.service";
import { AuthService } from "../services/auth.service";
import { ThemeService } from "../services/theme.service";
import { ApiService } from "../services/api.service";
import { IdleService } from "../services/idle.service";
import { CurrencyService } from "../services/currency.service";
import { PropertyContextService } from "../services/property-context.service";
import { LanguageSelectorComponent } from "../components/language-selector/language-selector.component";
import { CurrencySelectorComponent } from "../components/currency-selector/currency-selector.component";

@Component({
  selector: "app-layout",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    TranslatePipe,
    LanguageSelectorComponent,
    CurrencySelectorComponent,
  ],
  templateUrl: "./layout.component.html",
  styleUrl: "./layout.component.css",
})
export class LayoutComponent implements OnInit, OnDestroy {
  notifService = inject(NotificationService);
  theme = inject(ThemeService);
  private auth = inject(AuthService);
  private api = inject(ApiService);
  private translate = inject(TranslateService);
  private idle = inject(IdleService);
  private router = inject(Router);
  private currency = inject(CurrencyService);
  propertyCtx = inject(PropertyContextService);
  sidebarOpen = false;

  ngOnInit(): void {
    // Load currency list + exchange rates now that the user is authenticated.
    this.currency.loadReferenceData();

    // Populate the property switcher with this vendor's properties (internal/staff
    // accounts have no vendorId, so the switcher stays hidden for them).
    const vendorId = this.auth.user()?.vendorId;
    if (vendorId) this.propertyCtx.loadForVendor(vendorId);

    // Auto-logout after 10 minutes of inactivity while inside the app.
    this.idle.start(() => {
      this.auth.logout();
      this.router.navigate(["/login"], { queryParams: { reason: "idle" } });
    });
  }

  ngOnDestroy(): void {
    this.idle.stop();
  }

  // ─── User menu / change password ────────────────────────────
  userMenuOpen = false;
  showPasswordModal = false;
  pwSaving = false;
  pwError: string | null = null;
  pw = { current: "", next: "", confirm: "" };
  toast: { type: string; key: string } | null = null;

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

  openChangePassword(): void {
    this.userMenuOpen = false;
    this.pw = { current: "", next: "", confirm: "" };
    this.pwError = null;
    this.showPasswordModal = true;
  }

  closePasswordModal(): void {
    if (this.pwSaving) return;
    this.showPasswordModal = false;
    this.pw = { current: "", next: "", confirm: "" };
    this.pwError = null;
  }

  submitPassword(): void {
    if (this.pw.next.length < 6 || this.pw.next !== this.pw.confirm || !this.pw.current) {
      return;
    }
    this.pwSaving = true;
    this.pwError = null;
    this.api.changePassword(this.pw.current, this.pw.next).subscribe({
      next: () => {
        this.pwSaving = false;
        this.showPasswordModal = false;
        this.pw = { current: "", next: "", confirm: "" };
        this.showToast("success", "profile.passwordChanged");
      },
      error: (err) => {
        this.pwSaving = false;
        this.pwError = this.extractError(err);
      },
    });
  }

  private extractError(err: any): string {
    const body = err?.error;
    if (typeof body?.message === "string") return body.message;
    if (typeof body?.error === "string") return body.error;
    return this.translate.instant("profile.changeError");
  }

  private showToast(type: string, key: string): void {
    this.toast = { type, key };
    setTimeout(() => (this.toast = null), 3500);
  }
}
