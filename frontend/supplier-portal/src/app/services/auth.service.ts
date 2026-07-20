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
 * Persists to localStorage so the session survives page refreshes.
 */
@Injectable({ providedIn: "root" })
export class AuthService {
  private currentUser = signal<AppUser | null>(this.loadUser());
  private accessToken = signal<string | null>(this.loadToken());

  readonly user = this.currentUser.asReadonly();
  readonly userId = computed(() => this.currentUser()?.id ?? null);
  readonly isLoggedIn = computed(() => this.currentUser() !== null);

  /** Called after successful login — stores both the user and JWT token */
  login(user: AppUser, token: string): void {
    this.currentUser.set(user);
    this.accessToken.set(token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem(TOKEN_KEY, token);
  }

  /** Returns the stored JWT token (used by the HTTP interceptor) */
  getToken(): string | null {
    return this.accessToken();
  }

  logout(): void {
    this.currentUser.set(null);
    this.accessToken.set(null);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
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
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  private loadToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }
}
