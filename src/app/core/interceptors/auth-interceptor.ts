import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

/**
 * Runs on every HTTP request the app sends.
 * 1. Adds "Authorization: Bearer <token>", but ONLY for our own API. The token must never be
 *    sent to another host (map tiles, a payment page…), where it could be logged or stolen.
 * 2. On 401 from a protected call (token expired or revoked), ends the session and goes to login.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const isOurApi = req.url.startsWith(environment.apiUrl);
  const token = auth.token();

  const authorized =
    isOurApi && token
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}`, Accept: 'application/json' } })
      : req;

  return next(authorized).pipe(
    catchError((err: unknown) => {
      // /auth/* calls handle their own 401s (AuthService.restoreSession / login), so no redirect here.
      const isAuthCall = req.url.startsWith(`${environment.apiUrl}/auth/`);
      if (err instanceof HttpErrorResponse && err.status === 401 && isOurApi && !isAuthCall && token) {
        // Session is no longer valid on the server: clean up locally, then send the user to login.
        void auth.clearSession().then(() => router.navigateByUrl('/auth/login', { replaceUrl: true }));
      }
      return throwError(() => err);
    }),
  );
};
