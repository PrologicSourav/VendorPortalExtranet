import { Injectable } from "@angular/core";

const TOKEN_KEY = "wp_gov_token";

/**
 * The governance console is launched embedded from the hotel-facing host
 * application, which owns authentication. The host hands this app an internal
 * (governance) JWT in one of two ways:
 *   1. as a `token` (or `access_token`) query-string parameter on the launch URL
 *   2. by pre-seeding sessionStorage under `wp_gov_token`
 *
 * On startup we capture a query-param token into sessionStorage (per-tab, so it
 * clears when the tab closes) and strip it from the URL so the raw JWT does not
 * linger in browser history, the address bar, or the Referer header.
 */
@Injectable({ providedIn: "root" })
export class AuthTokenService {
  constructor() {
    this.captureTokenFromUrl();
  }

  private captureTokenFromUrl(): void {
    try {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token") ?? params.get("access_token");
      if (!token) return;

      sessionStorage.setItem(TOKEN_KEY, token);
      params.delete("token");
      params.delete("access_token");

      const qs = params.toString();
      const cleanUrl =
        window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash;
      window.history.replaceState({}, document.title, cleanUrl);
    } catch {
      // sessionStorage / history unavailable (e.g. sandboxed iframe) — ignore.
    }
  }

  get token(): string | null {
    try {
      return sessionStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }

  get hasToken(): boolean {
    return !!this.token;
  }
}
