/** A position the app can use: plain numbers, independent of any plugin's types. */
export interface GeoPoint {
  lat: number;
  lng: number;
  /** Radius of uncertainty in meters (about 5–30 m for GPS outdoors, hundreds for "approximate"). */
  accuracyM: number;
  /** When the position was measured (milliseconds since 1970). */
  timestamp: number;
}

/**
 * - granted:     precise location allowed
 * - approximate: only approximate location allowed (Android 12+ user choice)
 * - denied:      not allowed
 * - prompt:      not decided yet; the app may ask
 * - unknown:     cannot tell (e.g. some browsers)
 */
export type LocationPermission = 'granted' | 'approximate' | 'denied' | 'prompt' | 'unknown';

export type LocationErrorKind = 'DENIED' | 'GPS_OFF' | 'TIMEOUT' | 'CONFIG' | 'UNAVAILABLE';

// User-facing Taglish messages (glossary: docs/design-briefs/passenger-booking.md § 8).
// Pages may show a more specific message for their context; these are the defaults.
const MESSAGES: Record<LocationErrorKind, string> = {
  DENIED: 'Hindi pinayagan ang lokasyon. Buksan ang Settings para payagan ito.',
  GPS_OFF: 'Hindi makuha ang lokasyon mo. Siguraduhing naka-on ang GPS.',
  TIMEOUT: 'Hindi makuha ang lokasyon mo. Subukan ulit.',
  CONFIG: 'May problema sa setup ng app (location permission).',
  UNAVAILABLE: 'Hindi makuha ang lokasyon mo.',
};

/**
 * Translates plugin error codes into one small set of kinds the app understands.
 * Android codes come from the @capacitor/geolocation README (OS-PLUG-GLOC-xxxx);
 * browser codes come from the web Geolocation API (1 = denied, 2 = unavailable, 3 = timeout).
 */
function kindFromCode(code: unknown): LocationErrorKind {
  switch (code) {
    case 'OS-PLUG-GLOC-0003': // permission request was denied
    case 1:
      return 'DENIED';
    case 'OS-PLUG-GLOC-0007': // location services are not enabled
    case 'OS-PLUG-GLOC-0009': // user refused to enable location
    case 'OS-PLUG-GLOC-0017': // both network and location turned off
      return 'GPS_OFF';
    case 'OS-PLUG-GLOC-0010': // could not obtain location in time
    case 3:
      return 'TIMEOUT';
    case 'OS-PLUG-GLOC-0018': // permissions missing from AndroidManifest.xml
      return 'CONFIG';
    default:
      return 'UNAVAILABLE';
  }
}

export class LocationError extends Error {
  constructor(
    readonly kind: LocationErrorKind,
    /** The original plugin/browser error, kept for debugging. */
    readonly original?: unknown,
  ) {
    super(MESSAGES[kind]);
    this.name = 'LocationError';
  }

  /** Wrap any thrown value as a LocationError. */
  static from(err: unknown): LocationError {
    if (err instanceof LocationError) {
      return err;
    }
    const code = (err as { code?: unknown } | null)?.code;
    return new LocationError(kindFromCode(code), err);
  }
}
