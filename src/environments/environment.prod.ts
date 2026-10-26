import { MAPTILER_KEY } from './map-key';
import { mapTilesFor } from './map-tiles';

// Production settings: swapped in by `ng build` (angular.json → fileReplacements).
export const environment = {
  production: true,
  // Real HTTPS API address, set when the backend is deployed.
  apiUrl: 'https://api.example.invalid/api/v1',
  // The admin's phone number, shown to suspended drivers as "Tawagan ang admin" (Phase 7).
  // Empty = not decided yet: the button stays hidden. Set the real number before release.
  supportPhone: '',
  // Map tiles (Phase 12): MapTiler 'Streets' when map-key.ts has a key, else OpenStreetMap.
  mapTiles: mapTilesFor(MAPTILER_KEY),
  // Place search and the pickup's name on Book (MapTiler Geocoding, the same key). Empty = both hidden.
  mapTilerKey: MAPTILER_KEY,
};
