import { HttpInterceptorFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { AuthTokenService } from "../services/auth-token.service";
import { environment } from "../../environments/environment";

/**
 * Attaches the host-provided internal JWT as a Bearer token on calls to our
 * own API only. Third-party requests (if any) are left untouched so we never
 * leak the token to another origin.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthTokenService).token;
  if (token && req.url.startsWith(environment.apiUrl)) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  return next(req);
};
