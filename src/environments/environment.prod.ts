// Production settings: swapped in by `ng build` (angular.json → fileReplacements).
export const environment = {
  production: true,
  // Real HTTPS API address, set when the backend is deployed.
  apiUrl: 'https://api.example.invalid/api/v1',
  // The admin's phone number, shown to suspended drivers as "Tawagan ang admin" (Phase 7).
  // Empty = not decided yet: the button stays hidden. Set the real number before release.
  supportPhone: '',
};
