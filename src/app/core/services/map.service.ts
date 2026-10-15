import { Injectable } from '@angular/core';
import * as L from 'leaflet';
import { environment } from '../../../environments/environment';
import { TRICYCLE_SVG } from '../../shared/icons/tricycle.icon';

export interface LatLng {
  lat: number;
  lng: number;
}

export type MarkerKind = 'pickup' | 'destination' | 'driver';

/**
 * One map on screen, through the few things the app needs (phase-0 § I). Pages talk to this,
 * never to Leaflet, so the map library could be swapped without touching a page.
 */
export interface AppMap {
  /** The point under the fixed center pin (booking: "move the map under the pin"). */
  center(): LatLng;
  setView(point: LatLng, zoom?: number): void;
  /** Show, move or (null) remove one of the three markers. */
  setMarker(kind: MarkerKind, point: LatLng | null): void;
  /** Zoom and pan so every point is visible. */
  fit(points: LatLng[]): void;
  /** Called after each pan / zoom with the new center. Returns a function that stops listening. */
  onMoveEnd(listener: (center: LatLng) => void): () => void;
  /** Tell the map its box changed size (Leaflet measures it once). */
  resize(): void;
  destroy(): void;
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
    L.tileLayer(environment.mapTiles.url, {
      attribution: environment.mapTiles.attribution, // required by the OpenStreetMap licence
      maxZoom: environment.mapTiles.maxZoom,
    }).addTo(map);
    map.attributionControl.setPrefix(false); // keep only the required credit

    const markers = new Map<MarkerKind, L.Marker>();

    return {
      center: () => {
        const c = map.getCenter();
        return { lat: c.lat, lng: c.lng };
      },
      setView: (point, z) => map.setView([point.lat, point.lng], z ?? map.getZoom(), { animate }),
      setMarker: (kind, point) => {
        const existing = markers.get(kind);
        if (!point) {
          existing?.remove();
          markers.delete(kind);
          return;
        }
        if (existing) {
          existing.setLatLng([point.lat, point.lng]);
          return;
        }
        markers.set(kind, L.marker([point.lat, point.lng], { icon: MapService.icon(kind), keyboard: false, interactive: false }).addTo(map));
      },
      fit: (points) => {
        if (points.length === 1) {
          map.setView([points[0].lat, points[0].lng], 16, { animate });
        } else if (points.length > 1) {
          map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng] as L.LatLngTuple)), { padding: [48, 48], maxZoom: 17, animate });
        }
      },
      onMoveEnd: (listener) => {
        const handler = () => {
          const c = map.getCenter();
          listener({ lat: c.lat, lng: c.lng });
        };
        map.on('moveend', handler);
        return () => map.off('moveend', handler);
      },
      resize: () => map.invalidateSize(),
      destroy: () => map.remove(),
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
