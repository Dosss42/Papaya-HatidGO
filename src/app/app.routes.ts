import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';
import { guestGuard } from './core/guards/guest-guard';
import { roleGuard } from './core/guards/role-guard';

// Top level only: which AREA of the app, and who may enter it.
// Guards are UX only; Laravel enforces real security (Phase 5+).
export const routes: Routes = [
  { path: '', redirectTo: 'auth/welcome', pathMatch: 'full' },
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
  { path: '**', redirectTo: '' },
];
