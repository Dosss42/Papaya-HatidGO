import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LatLng } from './map.service';

/** One place found by the search, ready for the booking screen. */
export interface PlaceResult {
  /** The place itself, e.g. "General Tinio Public Market". */
  name: string;
  /** Where it is, e.g. "Poblacion, General Tinio, Nueva Ecija". */
  detail: string;
  lat: number;
  lng: number;
}

/** The parts of MapTiler's answer (GeoJSON features) the app reads. */
interface GeoFeature {
  text?: string;
  place_name?: string;
  place_type?: string[];
  center?: [number, number]; // [lng, lat]
}

/**
 * What the pin's name may be built from: streets and barangays/places. Not landmarks (POIs):
 * in a small town many are personal or joke names someone typed into OpenStreetMap, and not
 * postal codes ("3104, Philippines" tells a driver nothing). Found on the real map, after Phase 13.
 */
const NAME_TYPES = 'address,road,neighbourhood,locality,place';

interface GeoResponse {
  features?: GeoFeature[];
}

/** Ask for a place this long at most; the map still works without it. */
const TIMEOUT_MS = 8000;

/**
 * Place names on the booking screen (the student's request after Phase 13), from MapTiler's
 * Geocoding API with the same key as the map tiles (free up to 100,000 requests a month):
 *
 * - search(): "Papaya public market" → places near the town, for the pickup or the destination;
 * - nameAt(): the pin's spot → a short name ("Rizal St, Poblacion"), so the driver knows where to go.
 *
 * Without a key, available is false and Book shows neither (the pin and a typed landmark still work).
 * These requests go to MapTiler, never to our API, so the login token is not attached
 * (authInterceptor only adds it for our own API).
 */
@Injectable({ providedIn: 'root' })
export class GeocodingService {
  private readonly http = inject(HttpClient);
  private readonly key = (environment.mapTilerKey ?? '').trim();
  private readonly base = 'https://api.maptiler.com/geocoding';

  readonly available = this.key !== '';

  /**
   * Places matching the words, ONLY inside `box` (the service area's bounding box, [west, south,
   * east, north]), nearest to `near` first. Without the box, "public market" finds Calamba and
   * Baguio first: the nearness hint alone is only a preference.
   */
  async search(query: string, near: LatLng, box: [number, number, number, number]): Promise<PlaceResult[]> {
    const res = await firstValueFrom(
      this.http
        .get<GeoResponse>(`${this.base}/${encodeURIComponent(query.trim())}.json`, {
          params: { key: this.key, bbox: box.join(','), proximity: `${near.lng},${near.lat}`, language: 'en', limit: 8 },
        })
        .pipe(timeout(TIMEOUT_MS)),
    );
    return (res.features ?? []).map(toPlace).filter((p): p is PlaceResult => p !== null);
  }

  /** A short name for the spot under the pin ("Rizal Street, Poblacion"), or null when nothing useful is known. */
  async nameAt(point: LatLng): Promise<string | null> {
    const res = await firstValueFrom(
      this.http
        .get<GeoResponse>(`${this.base}/${point.lng},${point.lat}.json`, {
          params: { key: this.key, language: 'en', types: NAME_TYPES },
        })
        .pipe(timeout(TIMEOUT_MS)),
    );
    return spotName(res.features ?? []);
  }
}

/**
 * The pin's name from what lies under it: "street, barangay" when both are known (the most a
 * driver needs; the town is the same for every ride), else whichever one there is.
 */
export function spotName(features: GeoFeature[]): string | null {
  const isA = (f: GeoFeature, types: string[]) => (f.place_type ?? []).some((t) => types.includes(t));
  const street = features.find((f) => isA(f, ['address', 'road']));
  const area = features.find((f) => isA(f, ['neighbourhood', 'locality', 'place']));
  if (street?.text && area?.text) return street.text === area.text ? street.text : `${street.text}, ${area.text}`;
  const only = street ?? area;
  return only?.place_name ? shortName(only.place_name) || null : null;
}

/**
 * "Rizal Street, 3104 General Tinio, Philippines" → "Rizal Street, General Tinio": the two most
 * specific parts, without postal codes or the country. A repeated part is shown once.
 */
export function shortName(placeName: string): string {
  const parts = placeName
    .split(',')
    .map((p) => p.trim().replace(/^\d{4}\s+/, '')) // "3104 General Tinio" → "General Tinio"
    .filter((p) => p !== '' && p !== 'Philippines' && !/^\d+$/.test(p));
  return [...new Set(parts)].slice(0, 2).join(', ');
}

/** A feature as a search result: its own name, then where it is (without postal codes or the country). */
export function toPlace(feature: GeoFeature): PlaceResult | null {
  if (!feature.center || !feature.place_name) return null;
  const parts = feature.place_name
    .split(',')
    .map((p) => p.trim().replace(/^\d{4}\s+/, ''))
    .filter((p) => p !== '' && p !== 'Philippines' && !/^\d+$/.test(p));
  const name = feature.text?.trim() || parts[0] || '';
  const detail = parts.filter((p) => p !== name).slice(0, 3).join(', ');
  return name ? { name, detail, lat: feature.center[1], lng: feature.center[0] } : null;
}
