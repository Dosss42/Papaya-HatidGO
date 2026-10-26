import type { MessageKey } from '../i18n/messages.en';
import type { LatLng } from './map.service';

/**
 * Small, pure map helpers (Phase 12): no Leaflet here, so they're easy to test and reuse.
 */

/** How long the driver's marker glides to a new position (decision #3). */
export const GLIDE_MS = 1000;

/**
 * A driver position older than this is "stale" (decision #4): the driver sends every 10 s
 * during a ride, so 45 s means several sends were missed (no signal, no GPS, phone asleep).
 */
export const STALE_AFTER_MS = 45_000;

/** The point `t` (0 → 1) of the way from `a` to `b`. Straight lines are fine at town scale. */
export function lerpPoint(a: LatLng, b: LatLng, t: number): LatLng {
  const k = Math.min(1, Math.max(0, t));
  return { lat: a.lat + (b.lat - a.lat) * k, lng: a.lng + (b.lng - a.lng) * k };
}

/** Ease-out (fast start, gentle stop): the marker "arrives" rather than stopping dead. */
export function easeOut(t: number): number {
  const k = Math.min(1, Math.max(0, t));
  return 1 - (1 - k) ** 3;
}

/**
 * How old a position is now, in ms. Built from an age measured on ONE clock, so a phone whose
 * clock is off can't fake it: the server's `age_seconds` when the answer arrived, plus the time
 * since then on this phone (finish review #5). Null = unknown.
 */
export function ageNow(ageSecondsAtReceipt: number | null | undefined, receivedAt: number, now: number = Date.now()): number | null {
  if (ageSecondsAtReceipt === null || ageSecondsAtReceipt === undefined) return null;
  return Math.max(0, ageSecondsAtReceipt * 1000 + (now - receivedAt));
}

/** Is a position this old (ms) too old to show as live? Unknown age = stale. */
export function isStale(ageMs: number | null | undefined): boolean {
  return ageMs === null || ageMs === undefined || ageMs > STALE_AFTER_MS;
}

/** "40 sec" / "2 min" for "Last location: … ago" (never negative). */
export function ageText(ageMs: number): { key: MessageKey; n: number } {
  const seconds = Math.max(0, Math.round(ageMs / 1000));
  return seconds < 60 ? { key: 'ride.agoSec', n: seconds } : { key: 'ride.agoMin', n: Math.floor(seconds / 60) };
}

export interface RideLines {
  route: LatLng[] | null;
  approach: LatLng[] | null;
  trail: LatLng[] | null;
}

/**
 * Which lines a ride map shows (decisions #1, #2, #5), the same on both people's screens:
 * - before the trip: the route, plus the driver's approach to the pickup when the driver's
 *   position is live (a stale position draws no line: it would point from the wrong place);
 * - during the trip: the route;
 * - over: the path actually driven, if there is one; otherwise the planned route.
 */
export function rideLines(
  status: string,
  pickup: LatLng,
  destination: LatLng,
  driver: LatLng | null,
  driverStale: boolean,
  driven: LatLng[] | null,
  road: LatLng[] | null = null,
): RideLines {
  // The road the fare was measured on (after Phase 13); a straight line for rides booked before it.
  const route = road && road.length >= 2 ? road : [pickup, destination];
  if (status === 'completed' || status === 'cancelled') {
    return driven && driven.length >= 2 ? { route: null, approach: null, trail: driven } : { route, approach: null, trail: null };
  }
  const approaching = (status === 'accepted' || status === 'driver_arriving') && driver && !driverStale;
  return { route, approach: approaching ? [driver, pickup] : null, trail: null };
}

/** The API's road line ([[lat, lng], …]) as map points; null when there is none (older rides). */
export function roadPoints(route: [number, number][] | null | undefined): LatLng[] | null {
  return route && route.length >= 2 ? route.map(([lat, lng]) => ({ lat, lng })) : null;
}

/** Same place (to ~1 m)? Then there's nothing to glide or redraw. */
export function samePoint(a: LatLng | null, b: LatLng | null): boolean {
  if (!a || !b) return a === b;
  return Math.abs(a.lat - b.lat) < 0.00001 && Math.abs(a.lng - b.lng) < 0.00001;
}
