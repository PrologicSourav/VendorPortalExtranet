import { Injectable, signal, computed } from "@angular/core";

export interface AppUser {
  id: string;
  email: string;
  displayName: string;
  role: string;
  isInternal: boolean;
  vendorId?: string;
}

const USER_KEY = "wp_current_user";
const TOKEN_KEY = "wp_access_token";

/**
 * Manages the currently logged-in user and JWT access token.
 * Stored in sessionStorage so the session survives a page refresh but is
 * cleared when the browser tab is closed (per-tab session).
 */
@Injectable({ providedIn: "root" })
export class AuthService {
  private currentUser = signal<AppUser | null>(this.loadUser());
  private accessToken = signal<string | null>(this.loadToken());

  readonly user = this.currentUser.asReadonly();
  readonly userId = computed(() => this.currentUser()?.id ?? null);
  readonly isLoggedIn = computed(() => this.currentUser() !== null);

  constructor() {
    // One-time cleanup: earlier builds kept the session in localStorage (which
    // persisted across tab closes). Remove any legacy copy so it can't linger.
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
  }

  /** Called after successful login — stores both the user and JWT token */
  login(user: AppUser, token: string): void {
    this.currentUser.set(user);
    this.accessToken.set(token);
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    sessionStorage.setItem(TOKEN_KEY, token);
  }

  /** Returns the stored JWT token (used by the HTTP interceptor) */
  getToken(): string | null {
    return this.accessToken();
  }

  /**
   * True only when there is a stored user AND a non-expired access token.
   * Route guards use this (not isLoggedIn) so a lingering user record with an
   * expired/invalid token is treated as logged out and sent back to login.
   */
  isAuthenticated(): boolean {
    const token = this.accessToken();
    if (!this.currentUser() || !token) return false;
    return !this.isTokenExpired(token);
  }

  private isTokenExpired(token: string): boolean {
    const payload = this.decodeJwtPayload(token);
    // No parseable payload or missing exp → treat as invalid/expired.
    if (!payload || typeof payload.exp !== "number") return true;
    // exp is in seconds since epoch.
    return Date.now() >= payload.exp * 1000;
  }

  private decodeJwtPayload(token: string): { exp?: number } | null {
    try {
      const base64 = token.split(".")[1]?.replace(/-/g, "+").replace(/_/g, "/");
      if (!base64) return null;
      return JSON.parse(atob(base64));
    } catch {
      return null;
    }
  }

  logout(): void {
    this.currentUser.set(null);
    this.accessToken.set(null);
    sessionStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  }

  /** For demo / development — sets the seeded vendor user so notifications work */
  loginAsVendor(): void {
    this.login(
      {
        id: "00000000-0000-0000-0000-000000000003",
        email: "vendor@mumbaifresh.com",
        displayName: "Rajesh Kumar",
        role: "SupplierAdmin",
        isInternal: false,
      },
      "demo-token",
    );
  }

  private loadUser(): AppUser | null {
    try {
      const raw = sessionStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  private loadToken(): string | null {
    try {
      return sessionStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }
}
