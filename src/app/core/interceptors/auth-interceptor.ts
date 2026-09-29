import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { I18nService } from '../i18n/i18n.service';
import { AuthService } from '../services/auth.service';

/**
 * Runs on every HTTP request the app sends.
 * 1. Adds "Authorization: Bearer <token>", but ONLY for our own API. The token must never be
 *    sent to another host (map tiles, a payment page…), where it could be logged or stolen.
 * 2. Tells our API the app's language (Accept-Language: en | fil), so its messages match the screens.
 * 3. On 401 from a protected call (token expired or revoked), ends the session and goes to login.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const i18n = inject(I18nService);

  const isOurApi = req.url.startsWith(environment.apiUrl);
  const token = auth.token();

  let authorized = req;
  if (isOurApi) {
    const headers: Record<string, string> = { Accept: 'application/json', 'Accept-Language': i18n.lang() };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    authorized = req.clone({ setHeaders: headers });
  }

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
