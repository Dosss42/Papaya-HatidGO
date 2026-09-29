import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Runs on every HTTP request the app sends.
 * Phase 2: passes requests through unchanged (the pipeline is wired, nothing to add yet).
 * Phase 5: attaches `Authorization: Bearer <token>` and handles 401 (expired/revoked token).
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req);
};
