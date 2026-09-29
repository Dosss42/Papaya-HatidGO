import { Routes } from '@angular/router';

export const DRIVER_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/driver-tabs/driver-tabs.page').then((m) => m.DriverTabsPage),
    children: [
      {
        path: 'home',
        loadComponent: () =>
          import('./pages/driver-home/driver-home.page').then((m) => m.DriverHomePage),
      },
      {
        path: 'rides',
        loadComponent: () =>
          import('./pages/driver-rides/driver-rides.page').then((m) => m.DriverRidesPage),
      },
      {
        path: 'earnings',
        loadComponent: () =>
          import('./pages/driver-earnings/driver-earnings.page').then((m) => m.DriverEarningsPage),
      },
      {
        path: 'account',
        loadComponent: () =>
          import('./pages/driver-account/driver-account.page').then((m) => m.DriverAccountPage),
      },
      { path: '', redirectTo: 'home', pathMatch: 'full' },
    ],
  },
];
