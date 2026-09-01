import { Injectable } from "@angular/core";

const TOKEN_KEY = "wp_gov_token";
const PROPERTY_KEY = "wp_gov_property_id";

/**
 * The governance console is launched embedded from the hotel-facing host
 * application, which owns authentication. The host hands this app an internal
 * (governance) JWT in one of two ways:
 *   1. as a `token` (or `access_token`) query-string parameter on the launch URL
 *   2. by pre-seeding sessionStorage under `wp_gov_token`
 *
 * The same launch URL can optionally carry `propertyId` — the WISH property_id
 * of the property the host session is currently in — to scope this console
 * session to just that property. Every governance screen behaves globally
 * (today's default) when it's absent.
 *
 * On startup we capture both query params into sessionStorage (per-tab, so
 * they clear when the tab closes) and strip them from the URL so the raw JWT
 * does not linger in browser history, the address bar, or the Referer header.
 */
@Injectable({ providedIn: "root" })
export class AuthTokenService {
  constructor() {
    this.captureFromUrl();
  }

  private captureFromUrl(): void {
    try {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token") ?? params.get("access_token");
      const propertyId = params.get("propertyId");
      if (!token && !propertyId) return;

      if (token) sessionStorage.setItem(TOKEN_KEY, token);
      if (propertyId) sessionStorage.setItem(PROPERTY_KEY, propertyId);
      params.delete("token");
      params.delete("access_token");
      params.delete("propertyId");

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

  /** The WISH property_id this session is scoped to, or null for an
   * unscoped (global) session — the default when launched without one. */
  get propertyId(): string | null {
    try {
      return sessionStorage.getItem(PROPERTY_KEY);
    } catch {
      return null;
    }
  }
}
