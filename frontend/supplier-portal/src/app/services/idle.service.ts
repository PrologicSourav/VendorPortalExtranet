import { Injectable } from "@angular/core";

const IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
const CHECK_INTERVAL_MS = 30 * 1000; // re-check every 30s
const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
  "click",
] as const;

/**
 * Logs the user out after a period of inactivity. Any user interaction resets
 * the timer; if no activity occurs for IDLE_TIMEOUT_MS the supplied callback
 * fires. Started by the authenticated shell (LayoutComponent) and stopped when
 * it is destroyed, so it only runs while the user is inside the app.
 */
@Injectable({ providedIn: "root" })
export class IdleService {
  private lastActivity = Date.now();
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private onTimeout: (() => void) | null = null;
  private readonly markActivity = () => {
    this.lastActivity = Date.now();
  };

  start(onTimeout: () => void): void {
    if (this.intervalId) this.stop(); // avoid double-registration
    this.onTimeout = onTimeout;
    this.lastActivity = Date.now();

    // passive listeners — we only record a timestamp, cheap even for mousemove.
    ACTIVITY_EVENTS.forEach((e) =>
      window.addEventListener(e, this.markActivity, { passive: true }),
    );

    this.intervalId = setInterval(() => {
      if (Date.now() - this.lastActivity >= IDLE_TIMEOUT_MS) {
        const cb = this.onTimeout;
        this.stop();
        cb?.();
      }
    }, CHECK_INTERVAL_MS);
  }

  stop(): void {
    ACTIVITY_EVENTS.forEach((e) =>
      window.removeEventListener(e, this.markActivity),
    );
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.onTimeout = null;
  }
}
