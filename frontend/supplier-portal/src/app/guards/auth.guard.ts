import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { AuthService } from "../services/auth.service";

/**
 * Route guard that blocks access to protected routes
 * when the user is not logged in.
 *
 * Usage in app.routes.ts:
 *   canActivate: [authGuard]
 */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  // Not logged in, or the stored token is missing/expired — clear any stale
  // session and send the user to login.
  auth.logout();
  return router.createUrlTree(["/login"]);
};

/**
 * Guard for the login page — if already logged in,
 * redirect to dashboard instead of showing login again.
 */
export const loginGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Only a valid (non-expired) session skips the login page; a stale/expired
  // one falls through so the user can sign in again.
  if (!auth.isAuthenticated()) {
    return true;
  }

  // Already logged in with a valid session — go straight to dashboard.
  return router.createUrlTree(["/dashboard"]);
};
