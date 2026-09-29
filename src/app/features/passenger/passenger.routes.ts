import { Routes } from '@angular/router';

// The tabs page is the parent; each tab is a child route shown inside it.
// The child path must match the tab="" attribute in passenger-tabs.page.html.
export const PASSENGER_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/passenger-tabs/passenger-tabs.page').then((m) => m.PassengerTabsPage),
    children: [
      {
        path: 'book',
        loadComponent: () =>
          import('./pages/passenger-book/passenger-book.page').then((m) => m.PassengerBookPage),
      },
      {
        path: 'rides',
        loadComponent: () =>
          import('./pages/passenger-rides/passenger-rides.page').then((m) => m.PassengerRidesPage),
      },
      {
        path: 'account',
        loadComponent: () =>
          import('./pages/passenger-account/passenger-account.page').then(
            (m) => m.PassengerAccountPage,
          ),
      },
      { path: '', redirectTo: 'book', pathMatch: 'full' },
    ],
  },
];
