import { Routes } from '@angular/router';

// The tabs page is the parent; each tab is a child route shown inside it.
// The child path must match the tab="" attribute in passenger-tabs.page.html.
export const PASSENGER_ROUTES: Routes = [
  // Full-screen (no tab bar) task page, Phase 8: the same page as /driver/subscription.
  {
    path: 'subscription',
    loadComponent: () => import('../subscription/subscription.page').then((m) => m.SubscriptionPage),
  },
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
        // Phase 10: the active ride / ride details. A child of the tabs, so the tab bar stays
        // visible (active-ride brief § 7); the Book tab leads back here while a ride is active.
        path: 'ride/:id',
        loadComponent: () =>
          import('./pages/passenger-ride/passenger-ride.page').then((m) => m.PassengerRidePage),
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
