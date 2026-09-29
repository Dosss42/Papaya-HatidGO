import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Auth pages are for guests. A logged-in passenger/driver is sent to their home. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const home = auth.homeUrlFor(auth.role());
  return home ? router.parseUrl(home) : true;
};
