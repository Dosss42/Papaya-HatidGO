import { Routes } from '@angular/router';

export const DRIVER_ROUTES: Routes = [
  // Full-screen task pages (no tab bar while the driver does paperwork), opened from Home or
  // Account. The brief named them under /driver/account/…; they live here so Back always
  // returns to wherever the driver came from (Phase 7 step 7.8).
  {
    path: 'vehicle',
    loadComponent: () => import('./pages/driver-vehicle/driver-vehicle.page').then((m) => m.DriverVehiclePage),
  },
  {
    path: 'requirements',
    loadComponent: () =>
      import('./pages/driver-requirements/driver-requirements.page').then((m) => m.DriverRequirementsPage),
  },
  {
    path: 'requirements/:code', // e.g. drivers_license (the stable requirement code)
    loadComponent: () =>
      import('./pages/driver-requirement/driver-requirement.page').then((m) => m.DriverRequirementPage),
  },
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
