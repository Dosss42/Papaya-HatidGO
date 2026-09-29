import { inject } from '@angular/core';
import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';
import { guestGuard } from './core/guards/guest-guard';
import { roleGuard } from './core/guards/role-guard';
import { AuthService } from './core/services/auth.service';
import { environment } from '../environments/environment';

// Top level only: which AREA of the app, and who may enter it.
// Guards are UX only; Laravel enforces real security (Phase 5+).
export const routes: Routes = [
  // Start: Get Started the first time on this phone, Login afterwards (Phase 6). A logged-in
  // user is then sent on to their home by guestGuard.
  { path: '', redirectTo: () => inject(AuthService).guestStartUrl(), pathMatch: 'full' },
  {
    path: 'auth',
    canActivate: [guestGuard],
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: 'passenger',
    canActivate: [authGuard, roleGuard('passenger')],
    loadChildren: () =>
      import('./features/passenger/passenger.routes').then((m) => m.PASSENGER_ROUTES),
  },
  {
    path: 'driver',
    canActivate: [authGuard, roleGuard('driver')],
    loadChildren: () => import('./features/driver/driver.routes').then((m) => m.DRIVER_ROUTES),
  },
  // DEV ONLY: native-feature diagnostics (Phase 3). Not registered in production builds.
  ...(environment.production
    ? []
    : [
        {
          path: 'dev/diagnostics',
          loadComponent: () =>
            import('./features/dev/pages/diagnostics/diagnostics.page').then((m) => m.DiagnosticsPage),
        },
      ]),
  { path: '**', redirectTo: '' },
];
