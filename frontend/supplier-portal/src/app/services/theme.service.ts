import { Injectable, signal, inject } from "@angular/core";
import { DOCUMENT } from "@angular/common";

export type Theme = "light" | "dark";

const THEME_STORAGE_KEY = "wp_theme";

/**
 * Manages the light/dark colour theme. The choice is a data-theme attribute on
 * <html> (which flips the CSS variables in styles.scss) and is persisted so it
 * survives reloads. First-time visitors default to their OS preference.
 */
@Injectable({ providedIn: "root" })
export class ThemeService {
  private document = inject(DOCUMENT);
  private current = signal<Theme>(this.resolveInitialTheme());
  readonly theme = this.current.asReadonly();

  constructor() {
    this.apply(this.current());
  }

  toggle(): void {
    this.set(this.current() === "dark" ? "light" : "dark");
  }

  set(theme: Theme): void {
    this.current.set(theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    this.apply(theme);
  }

  private apply(theme: Theme): void {
    this.document.documentElement.setAttribute("data-theme", theme);
  }

  private resolveInitialTheme(): Theme {
    const saved = this.readSaved();
    if (saved) return saved;
    // No saved choice — honour the OS setting on first visit.
    const prefersDark =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    return prefersDark ? "dark" : "light";
  }

  private readSaved(): Theme | null {
    try {
      const v = localStorage.getItem(THEME_STORAGE_KEY);
      return v === "dark" || v === "light" ? v : null;
    } catch {
      return null;
    }
  }
}
