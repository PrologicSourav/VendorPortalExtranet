import { Injectable, signal, computed } from "@angular/core";

export interface AppUser {
  id: string;
  email: string;
  displayName: string;
  role: string;
  isInternal: boolean;
  vendorId?: string;
}

const STORAGE_KEY = "wp_current_user";

/**
 * Manages the currently logged-in user.
 * Persists to localStorage so the session survives page refreshes.
 *
 * NOTE: The backend AuthController currently returns a mock user with
 * a random GUID. Once real auth is wired, login() will populate this
 * service with the actual user from the database.
 */
@Injectable({ providedIn: "root" })
export class AuthService {
  private currentUser = signal<AppUser | null>(this.loadUser());

  readonly user = this.currentUser.asReadonly();
  readonly userId = computed(() => this.currentUser()?.id ?? null);
  readonly isLoggedIn = computed(() => this.currentUser() !== null);

  /** Called after successful login / OTP verification */
  login(user: AppUser): void {
    this.currentUser.set(user);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  }

  logout(): void {
    this.currentUser.set(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  /** For demo / development — sets the seeded vendor user so notifications work */
  loginAsVendor(): void {
    this.login({
      id: "00000000-0000-0000-0000-000000000003",
      email: "vendor@mumbaifresh.com",
      displayName: "Rajesh Kumar",
      role: "SupplierAdmin",
      isInternal: false,
    });
  }

  private loadUser(): AppUser | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}
