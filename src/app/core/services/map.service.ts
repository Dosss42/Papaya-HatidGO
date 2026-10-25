import { Injectable } from '@angular/core';
import * as L from 'leaflet';
import { environment } from '../../../environments/environment';
import { TRICYCLE_SVG } from '../../shared/icons/tricycle.icon';
import { GLIDE_MS, easeOut, lerpPoint, samePoint } from './map-geometry';

export interface LatLng {
  lat: number;
  lng: number;
}

export type MarkerKind = 'pickup' | 'destination' | 'driver';

/**
 * The three lines (Phase 12, decision #2), told apart by pattern, not only color:
 * route = the planned trip, Ink dashed · approach = driver → pickup, Deep Papaya dotted ·
 * trail = the path actually driven, Deep Papaya solid. Styles: theme/world.scss `.hg-line`.
 */
export type LineKind = 'route' | 'approach' | 'trail';

/**
 * One map on screen, through the few things the app needs (phase-0 § I). Pages talk to this,
 * never to Leaflet, so the map library could be swapped without touching a page.
 */
export interface AppMap {
  /** The point under the fixed center pin (booking: "move the map under the pin"). */
  center(): LatLng;
  setView(point: LatLng, zoom?: number): void;
  /**
   * Show, move or (null) remove one of the three markers. `glide`: move there over ~1 s instead
   * of jumping (the live driver, decision #3); jumps anyway under "Remove animations".
   */
  setMarker(kind: MarkerKind, point: LatLng | null, options?: { glide?: boolean }): void;
  /** An old position is drawn as old (grey ring, decision #4), never as live. */
  setMarkerStale(kind: MarkerKind, stale: boolean): void;
  /** Draw, replace or (null / fewer than 2 points) remove one of the three lines. */
  setLine(kind: LineKind, points: LatLng[] | null): void;
  /**
   * Zoom and pan so every point is visible. `inset` keeps points clear of what floats over the
   * map's edges (the status bar + back button on top, the sheet at the bottom), in CSS pixels.
   */
  fit(points: LatLng[], inset?: { top: number; bottom: number }): void;
  /** Is this point inside the visible area? (The driver's map re-centers only when it isn't.) */
  contains(point: LatLng): boolean;
  /** Called after each pan / zoom with the new center. Returns a function that stops listening. */
  onMoveEnd(listener: (center: LatLng) => void): () => void;
  /** Tell the map its box changed size (Leaflet measures it once). */
  resize(): void;
  destroy(): void;
}

/**
 * How much of a ride map's top and bottom edges is covered, so fitted pins stay in view: on top,
 * the status bar (measured from the page's white strip, so it holds on every phone) plus room
 * for a pin's height; at the bottom, the sheet's rounded overlap. The floating back button only
 * covers the top-left corner, so it isn't reserved across the whole width: on a ~270 px map that
 * cost half the height and zoomed a short ride out to the whole province (Phase 12 fix).
 */
export function rideMapInset(mapEl: HTMLElement): { top: number; bottom: number } {
  const page = mapEl.closest('.ion-page') ?? document;
  const statusBar = page.querySelector('.hg-statusbar-scrim')?.getBoundingClientRect().height ?? 24;
  return { top: statusBar + 36, bottom: 36 };
}

/**
 * Leaflet + OpenStreetMap (phase-0 decision 5: no API key, no billing). Markers are drawn with
 * CSS and inline SVG (styles: theme/world.scss, `.hg-marker`), so there are no image files to ship.
 * Movement honours "Remove animations" (prefers-reduced-motion).
 */
@Injectable({ providedIn: 'root' })
export class MapService {
  create(element: HTMLElement, center: LatLng, zoom = 16): AppMap {
    const animate = !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const map = L.map(element, {
      center: [center.lat, center.lng],
      zoom,
      zoomControl: false, // pinch to zoom; buttons would crowd a small phone screen
      attributionControl: true,
    });
    const tiles = environment.mapTiles; // MapTiler with a key, else OpenStreetMap (environments/map-tiles.ts)
    L.tileLayer(tiles.url, {
      attribution: tiles.attribution, // required by both providers' terms
      maxZoom: tiles.maxZoom,
      tileSize: tiles.tileSize,
      zoomOffset: tiles.zoomOffset,
    }).addTo(map);
    map.attributionControl.setPrefix(false); // keep only the required credit

    const markers = new Map<MarkerKind, L.Marker>();
    const stale = new Set<MarkerKind>();
    const glides = new Map<MarkerKind, number>(); // running animation frames
    const lines = new Map<LineKind, L.Polyline>();

    const stopGlide = (kind: MarkerKind) => {
      const frame = glides.get(kind);
      if (frame !== undefined) cancelAnimationFrame(frame);
      glides.delete(kind);
    };

    /** Move a marker to `to` over GLIDE_MS (from wherever it is now, even mid-glide). */
    const glide = (kind: MarkerKind, marker: L.Marker, to: LatLng) => {
      stopGlide(kind);
      const start = marker.getLatLng();
      const from = { lat: start.lat, lng: start.lng };
      if (!animate || samePoint(from, to)) {
        marker.setLatLng([to.lat, to.lng]);
        return;
      }
      const began = performance.now();
      const step = (now: number) => {
        const t = (now - began) / GLIDE_MS;
        const at = lerpPoint(from, to, easeOut(t));
        marker.setLatLng([at.lat, at.lng]);
        if (t < 1) glides.set(kind, requestAnimationFrame(step));
        else glides.delete(kind);
      };
      glides.set(kind, requestAnimationFrame(step));
    };

    const paintStale = (kind: MarkerKind) => markers.get(kind)?.getElement()?.classList.toggle('hg-marker--stale', stale.has(kind));

    return {
      center: () => {
        const c = map.getCenter();
        return { lat: c.lat, lng: c.lng };
      },
      setView: (point, z) => map.setView([point.lat, point.lng], z ?? map.getZoom(), { animate }),
      setMarker: (kind, point, options) => {
        const existing = markers.get(kind);
        if (!point) {
          stopGlide(kind);
          existing?.remove();
          markers.delete(kind);
          return;
        }
        if (existing) {
          if (options?.glide) glide(kind, existing, point);
          else {
            stopGlide(kind);
            existing.setLatLng([point.lat, point.lng]);
          }
          return;
        }
        markers.set(kind, L.marker([point.lat, point.lng], { icon: MapService.icon(kind), keyboard: false, interactive: false }).addTo(map));
        paintStale(kind);
      },
      setMarkerStale: (kind, isStale) => {
        if (isStale) stale.add(kind);
        else stale.delete(kind);
        paintStale(kind);
      },
      setLine: (kind, points) => {
        const existing = lines.get(kind);
        if (!points || points.length < 2) {
          existing?.remove();
          lines.delete(kind);
          return;
        }
        const latLngs = points.map((p) => [p.lat, p.lng] as L.LatLngTuple);
        if (existing) {
          existing.setLatLngs(latLngs);
          return;
        }
        // Colors and patterns come from CSS (.hg-line--*), so they follow the design tokens.
        lines.set(kind, L.polyline(latLngs, { className: `hg-line hg-line--${kind}`, interactive: false }).addTo(map));
      },
      // Re-framing snaps, never animates: Leaflet IGNORES a new view while a zoom animation is
      // running, so a second fit soon after the first (e.g. the driven path arriving right after
      // a ride ends) was dropped, and the new line stayed drawn for the old zoom (Phase 12 fix).
      fit: (points, inset) => {
        map.stop();
        if (points.length === 1) {
          map.setView([points[0].lat, points[0].lng], 16, { animate: false });
        } else if (points.length > 1) {
          map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng] as L.LatLngTuple)), {
            paddingTopLeft: [40, Math.max(40, inset?.top ?? 0)],
            paddingBottomRight: [40, Math.max(40, inset?.bottom ?? 0)],
            maxZoom: 17,
            animate: false,
          });
        }
      },
      contains: (point) => map.getBounds().pad(-0.1).contains([point.lat, point.lng]),
      onMoveEnd: (listener) => {
        const handler = () => {
          const c = map.getCenter();
          listener({ lat: c.lat, lng: c.lng });
        };
        map.on('moveend', handler);
        return () => map.off('moveend', handler);
      },
      resize: () => map.invalidateSize(),
      destroy: () => {
        glides.forEach((frame) => cancelAnimationFrame(frame));
        map.remove();
      },
    };
  }

  /** Pickup = papaya ring, destination = ink pin, driver = the tricycle in a white disc. */
  private static icon(kind: MarkerKind): L.DivIcon {
    const html = {
      pickup: '<span class="hg-marker__dot"></span>',
      destination: '<span class="hg-marker__pin"></span>',
      driver: `<span class="hg-marker__driver">${TRICYCLE_SVG}</span>`,
    }[kind];
    const size: [number, number] = kind === 'driver' ? [44, 44] : [28, 28];

    return L.divIcon({
      className: `hg-marker hg-marker--${kind}`,
      html,
      iconSize: size,
      iconAnchor: kind === 'destination' ? [14, 28] : [size[0] / 2, size[1] / 2], // a pin points with its tip
    });
  }
}
