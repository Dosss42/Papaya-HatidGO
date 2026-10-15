// Production settings: swapped in by `ng build` (angular.json → fileReplacements).
export const environment = {
  production: true,
  // Real HTTPS API address, set when the backend is deployed.
  apiUrl: 'https://api.example.invalid/api/v1',
  // The admin's phone number, shown to suspended drivers as "Tawagan ang admin" (Phase 7).
  // Empty = not decided yet: the button stays hidden. Set the real number before release.
  supportPhone: '',
  // Map tiles (Phase 10, MapService). OpenStreetMap: free, no key; the attribution is REQUIRED.
  mapTiles: {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
  },
};
