import { LatLng } from '../../core/services/map.service';
import { BookingOptions } from '../../shared/models/ride.model';

/**
 * The booking brief's E1 / E2 checks, done on the phone BEFORE a fare is asked for (brief § 2).
 * The same formula as the API's GeoService; the server still checks everything again.
 */

const EARTH_RADIUS_KM = 6371;
const rad = (deg: number) => (deg * Math.PI) / 180;

/** Straight-line (Haversine) distance in km. */
export function distanceKm(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/**
 * The square around the service-area circle, [west, south, east, north], for the place search
 * (only places in that box are asked for; insideArea then keeps the ones in the circle).
 * 1° of latitude ≈ 111 km; a degree of longitude shrinks with cos(latitude).
 */
export function areaBox(options: BookingOptions): [number, number, number, number] {
  const { center_lat, center_lng, radius_km } = options.service_area;
  const dLat = radius_km / 111;
  const dLng = radius_km / (111 * Math.cos(rad(center_lat)));
  const round = (n: number) => Math.round(n * 10000) / 10000;
  return [round(center_lng - dLng), round(center_lat - dLat), round(center_lng + dLng), round(center_lat + dLat)];
}

export function insideArea(options: BookingOptions, point: LatLng): boolean {
  const { center_lat, center_lng, radius_km } = options.service_area;
  return distanceKm({ lat: center_lat, lng: center_lng }, point) <= radius_km;
}

export function tooClose(options: BookingOptions, a: LatLng, b: LatLng): boolean {
  return distanceKm(a, b) * 1000 < options.min_distance_m;
}

/** The town center: where the map opens when the phone's location isn't available (brief L2). */
export function townCenter(options: BookingOptions): LatLng {
  return { lat: options.service_area.center_lat, lng: options.service_area.center_lng };
}
