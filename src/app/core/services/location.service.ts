import { Injectable, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Geolocation, PermissionStatus, Position } from '@capacitor/geolocation';
import { GeoPoint, LocationError, LocationPermission } from '../../shared/models/location.model';

/**
 * The only place in the app that talks to the GPS plugin.
 * Pages call this service; they never import @capacitor/geolocation directly.
 * Location is used only while booking and during a ride (decision 18): nothing here runs in the background.
 */
@Injectable({ providedIn: 'root' })
export class LocationService {
  private readonly _permission = signal<LocationPermission>('unknown');
  private readonly _lastPosition = signal<GeoPoint | null>(null);
  private readonly _watching = signal(false);
  private watchId: string | null = null;

  readonly permission = this._permission.asReadonly();
  readonly lastPosition = this._lastPosition.asReadonly();
  readonly watching = this._watching.asReadonly();

  /**
   * Checks the location permission and, on the phone, asks for it if not decided yet.
   * In the browser, asking is done by the browser itself when a position is requested.
   */
  async ensurePermission(): Promise<LocationPermission> {
    let status: LocationPermission;
    try {
      status = this.toPermission(await Geolocation.checkPermissions());
      if (status === 'prompt' && Capacitor.isNativePlatform()) {
        status = this.toPermission(
          await Geolocation.requestPermissions({ permissions: ['location', 'coarseLocation'] }),
        );
      }
    } catch (err) {
      // On the phone this throws when location services are off; on the web when the
      // Permissions API is missing (the browser will still prompt on getCurrentPosition).
      if (Capacitor.isNativePlatform()) {
        throw LocationError.from(err);
      }
      status = 'unknown';
    }
    this._permission.set(status);
    return status;
  }

  /** One position fix. Gives up after 10 seconds (TIMEOUT) instead of waiting forever. */
  async getCurrentPosition(): Promise<GeoPoint> {
    if ((await this.ensurePermission()) === 'denied') {
      throw new LocationError('DENIED');
    }
    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10_000,
        maximumAge: 0,
      });
      const point = this.toGeoPoint(position);
      this._lastPosition.set(point);
      return point;
    } catch (err) {
      throw LocationError.from(err);
    }
  }

  /**
   * Continuous updates (drivers, active rides). Call stopWatch() when done:
   * a forgotten watch keeps the GPS on and drains the battery.
   */
  async startWatch(
    onUpdate: (point: GeoPoint) => void,
    onError: (error: LocationError) => void,
    intervalMs = 10_000,
  ): Promise<void> {
    if (this._watching()) {
      return;
    }
    this._watching.set(true); // set first, so two quick calls cannot start two watches
    try {
      if ((await this.ensurePermission()) === 'denied') {
        throw new LocationError('DENIED');
      }
      this.watchId = await Geolocation.watchPosition(
        { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0, interval: intervalMs },
        (position, err) => {
          if (err) {
            onError(LocationError.from(err));
            return;
          }
          if (position) {
            const point = this.toGeoPoint(position);
            this._lastPosition.set(point);
            onUpdate(point);
          }
        },
      );
    } catch (err) {
      this._watching.set(false);
      throw LocationError.from(err);
    }
  }

  async stopWatch(): Promise<void> {
    if (!this.watchId) {
      return;
    }
    await Geolocation.clearWatch({ id: this.watchId });
    this.watchId = null;
    this._watching.set(false);
  }

  /** Plugin permission result → our simpler LocationPermission. */
  private toPermission(status: PermissionStatus): LocationPermission {
    if (status.location === 'granted') {
      return 'granted';
    }
    if (status.coarseLocation === 'granted') {
      return 'approximate'; // Android 12+: the user chose "Approximate"
    }
    if (status.location === 'denied') {
      return 'denied';
    }
    return 'prompt'; // 'prompt' or 'prompt-with-rationale': the app may still ask
  }

  /** Plugin Position → our plain GeoPoint (the rest of the app never sees plugin types). */
  private toGeoPoint(position: Position): GeoPoint {
    return {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracyM: position.coords.accuracy,
      timestamp: position.timestamp,
    };
  }
}
