// Development settings: used by `npm start` and `ng build --configuration development`.
export const environment = {
  production: false,
  // Laravel API base URL. Set properly in Phase 5:
  //  - browser (npm start):  http://localhost:8000/api/v1
  //  - Android emulator:     http://10.0.2.2:8000/api/v1   (10.0.2.2 = your PC, seen from the emulator)
  //  - USB phone:            http://localhost:8000/api/v1 after `adb reverse tcp:8000 tcp:8000`
  apiUrl: 'http://localhost:8000/api/v1',
};
