import { HttpInterceptorFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { AuthTokenService } from "../services/auth-token.service";
import { environment } from "../../environments/environment";

/**
 * Attaches the host-provided internal JWT as a Bearer token on calls to our
 * own API only. Third-party requests (if any) are left untouched so we never
 * leak the token to another origin. Also attaches the property-scope context
 * (see AuthTokenService) as a header the backend's GovernancePropertyMiddleware
 * reads — absent when this session wasn't launched scoped to one property.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthTokenService);
  if (req.url.startsWith(environment.apiUrl)) {
    const headers: Record<string, string> = {};
    if (auth.token) headers["Authorization"] = `Bearer ${auth.token}`;
    if (auth.propertyId) headers["X-Wish-Property-Id"] = auth.propertyId;
    if (Object.keys(headers).length > 0) {
      req = req.clone({ setHeaders: headers });
    }
  }
  return next(req);
};
