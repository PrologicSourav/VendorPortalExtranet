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

  if (auth.isLoggedIn()) {
    return true;
  }

  // Not logged in — redirect to login
  return router.createUrlTree(["/login"]);
};

/**
 * Guard for the login page — if already logged in,
 * redirect to dashboard instead of showing login again.
 */
export const loginGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) {
    return true;
  }

  // Already logged in — redirect to dashboard
  return router.createUrlTree(["/dashboard"]);
};
