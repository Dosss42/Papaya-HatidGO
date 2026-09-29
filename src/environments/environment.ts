// Development settings: used by `npm start` and `ng build --configuration development`.
export const environment = {
  production: false,
  // Laravel dev server (`php artisan serve` → 127.0.0.1:8000). One address for every target:
  //  - browser (npm start):     reaches the PC directly
  //  - USB phone AND emulator:  after `npm run adb:reverse` (adb reverse tcp:8000 tcp:8000),
  //                             the device's 127.0.0.1:8000 is forwarded to the PC over USB/adb.
  // 127.0.0.1 rather than "localhost": on Windows, localhost may resolve to IPv6 (::1),
  // where `php artisan serve` is not listening.
  apiUrl: 'http://127.0.0.1:8000/api/v1',
};
