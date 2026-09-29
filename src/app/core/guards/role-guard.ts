import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Role } from '../../shared/models/user.model';

/**
 * Guard factory: roleGuard('driver') returns a guard that only lets drivers in.
 * Anyone else is sent to their own home (or the welcome page).
 */
export function roleGuard(allowed: Role): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (auth.role() === allowed) {
      return true;
    }
    return router.parseUrl(auth.homeUrlFor(auth.role()) ?? '/auth/welcome');
  };
}
