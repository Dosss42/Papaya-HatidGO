import { inject } from '@angular/core';
import { Routes } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

// Routes for the auth area. Mounted at /auth by app.routes.ts,
// so 'login' here becomes the URL /auth/login.
export const AUTH_ROUTES: Routes = [
  {
    path: 'welcome',
    loadComponent: () => import('./pages/welcome/welcome.page').then((m) => m.WelcomePage),
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register.page').then((m) => m.RegisterPage),
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./pages/forgot-password/forgot-password.page').then((m) => m.ForgotPasswordPage),
  },
  { path: '', redirectTo: () => inject(AuthService).guestStartUrl(), pathMatch: 'full' },
];
