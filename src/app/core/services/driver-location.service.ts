import { Injectable, inject, signal } from '@angular/core';
import { distanceKm } from '../../features/passenger/booking-checks';
import { GeoPoint, LocationError } from '../../shared/models/location.model';
import { DriverRideService } from './driver-ride.service';
import { LocationService } from './location.service';

/** How often the driver's phone reports its position (phase-0 § I, driver-home brief § 3.2). */
export const IDLE_EVERY_MS = 60_000; // online, waiting: at most once a minute…
export const IDLE_MOVED_M = 100; //    …or sooner after moving 100 m
export const RIDE_EVERY_MS = 10_000; // during a ride: UPLOAD every 10 s (the trail + the passenger's distance line)…
export const RIDE_POINT_MS = 3_000; // …but RECORD a point about every 3 s, so the path follows the roads taken (Phase 12)
export const IDLE_POINT_MS = 10_000; // waiting online: the GPS needn't run as often (battery)
export const TRAIL_MIN_MOVE_M = 5; // closer than this to the last point: standing still, not a new point
export const TRAIL_MAX_ACCURACY_M = 50; // a fix this vague would zigzag the path: skipped (the next comes in ~3 s)
export const TRAIL_BACKLOG_MAX = 600; // unsent points kept through a signal gap (~30 min at 3 s)
const BATCH = 50; // the API's limit per upload
const BATCHES_PER_FLUSH = 3; // catching up after a gap without hitting the 30-a-minute limit

/**
 * ONE GPS watch for the driver (Phase 11 decision #4), with two cadences:
 * - idle (online, waiting) → POST /drivers/me/location, so matching sees a fresh position;
 * - ride → POST /rides/{id}/locations, which also moves the driver on the passenger's map.
 * Never runs while offline: location is used only while online or on a ride (decision 18).
 */
@Injectable({ providedIn: 'root' })
export class DriverLocationService {
  private readonly gps = inject(LocationService);
  private readonly api = inject(DriverRideService);

  private mode: 'off' | 'idle' | 'ride' = 'off';
  private rideId: number | null = null;
  private lastSent: GeoPoint | null = null;
  private lastSentAt = 0;
  private buffer: GeoPoint[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeat: ReturnType<typeof setInterval> | null = null;
  /** The interval the running GPS watch was started with (it is restarted to change it). */
  private watchMs: number | null = null;

  /** The last position SENT (the compact map's marker moves only with each send: brief § 2). */
  readonly sentPosition = signal<GeoPoint | null>(null);
  /** When that position was sent (this phone's clock): older than 45 s = stale, even with GPS working (Phase 12). */
  readonly sentAt = signal<number | null>(null);
  /** The GPS stopped answering (banner "Nawala ang GPS…"). */
  readonly gpsLost = signal(false);
  /** The server refused a ping because it has the driver offline (409 NOT_ONLINE). */
  readonly serverOffline = signal(false);
  /** The server refused the trail because the ride is over (or no longer this driver's). */
  readonly rideOver = signal(false);

  /** Online, waiting. `first` is the fix already taken when going online (sent with availability). */
  async startIdle(first?: GeoPoint): Promise<void> {
    this.mode = 'idle';
    this.rideId = null;
    this.serverOffline.set(false);
    this.clearTimers();
    if (first) this.markSent(first);
    // A phone lying still may get no watch updates at all, and the server switches off a driver
    // silent for 3 minutes: so at least once a minute, take a fresh fix and send it.
    this.heartbeat = setInterval(() => void this.beat(), IDLE_EVERY_MS);
    await this.ensureWatch(IDLE_POINT_MS);
  }

  /** On a ride: a point every ~3 s, uploaded in batches every 10 s. */
  async startRide(rideId: number): Promise<void> {
    this.mode = 'ride';
    this.rideId = rideId;
    this.buffer = [];
    this.rideOver.set(false);
    this.clearTimers();
    this.flushTimer = setInterval(() => void this.flush(), RIDE_EVERY_MS);
    await this.ensureWatch(RIDE_POINT_MS);
  }

  /** Offline (or logged out): the GPS stops; nothing is sent. */
  async stop(): Promise<void> {
    this.mode = 'off';
    this.rideId = null;
    this.buffer = [];
    this.clearTimers();
    this.sentPosition.set(null);
    this.sentAt.set(null);
    this.gpsLost.set(false);
    this.watchMs = null;
    await this.gps.stopWatch().catch(() => undefined);
  }

  /** "Subukan ulit" on the GPS-lost banner: restart the watch if it died, and send a fresh fix now. */
  async retryNow(): Promise<void> {
    if (this.mode === 'off') return;
    await this.ensureWatch(this.mode === 'ride' ? RIDE_POINT_MS : IDLE_POINT_MS);
    this.lastSentAt = 0;
    if (this.mode === 'idle') await this.beat();
    else await this.flush();
  }

  private clearTimers(): void {
    if (this.flushTimer) clearInterval(this.flushTimer);
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.flushTimer = null;
    this.heartbeat = null;
  }

  private async beat(): Promise<void> {
    if (this.mode !== 'idle' || Date.now() - this.lastSentAt < IDLE_EVERY_MS - 1000) return;
    try {
      const point = await this.gps.getCurrentPosition();
      this.gpsLost.set(false);
      await this.onPoint(point);
    } catch (e) {
      if (e instanceof LocationError) this.gpsLost.set(true);
    }
  }

  /** One watch at a time; switching between waiting and a ride restarts it with the new interval. */
  private async ensureWatch(intervalMs: number): Promise<void> {
    if (this.gps.watching()) {
      if (this.watchMs === intervalMs) return;
      await this.gps.stopWatch().catch(() => undefined);
    }
    this.watchMs = intervalMs;
    try {
      await this.gps.startWatch(
        (point) => {
          this.gpsLost.set(false);
          void this.onPoint(point);
        },
        () => this.gpsLost.set(true),
        intervalMs,
      );
    } catch {
      this.watchMs = null;
      this.gpsLost.set(true);
    }
  }

  private async onPoint(point: GeoPoint): Promise<void> {
    if (this.mode === 'ride') {
      if (this.keepForTrail(point)) this.buffer.push(point);
      return;
    }
    if (this.mode !== 'idle') return;

    const due = Date.now() - this.lastSentAt >= IDLE_EVERY_MS;
    const moved = this.lastSent ? distanceKm(this.lastSent, point) * 1000 >= IDLE_MOVED_M : true;
    if (!due && !moved) return;

    try {
      await this.api.location({ lat: point.lat, lng: point.lng });
      this.markSent(point);
    } catch (e) {
      if ((e as { code?: string }).code === 'NOT_ONLINE') this.serverOffline.set(true);
    }
  }

  /** During a ride: send what was collected (the newest point is the driver's position). */
  private async flush(): Promise<void> {
    if (this.mode !== 'ride' || !this.rideId) return;
    if (this.buffer.length === 0) {
      // Standing still (e.g. waiting at the pickup): no watch updates. A fresh fix every 30 s
      // keeps the passenger's map honest and the server's 3-minute rule satisfied.
      if (Date.now() - this.lastSentAt < 30_000) return;
      try {
        this.buffer.push(await this.gps.getCurrentPosition());
        this.gpsLost.set(false);
      } catch {
        this.gpsLost.set(true);
        return;
      }
    }
    // Oldest first, a few batches per tick: after a signal gap the backlog catches up in order.
    for (let i = 0; i < BATCHES_PER_FLUSH && this.buffer.length > 0; i++) {
      if (this.mode !== 'ride' || !this.rideId) return;
      const points = this.buffer.splice(0, BATCH);
      try {
        await this.api.trail(this.rideId, points.map((p) => ({
          lat: p.lat,
          lng: p.lng,
          accuracy_m: Number.isFinite(p.accuracyM) ? Math.round(p.accuracyM) : null,
          recorded_at: new Date(p.timestamp).toISOString(),
        })));
        this.markSent(points[points.length - 1]);
      } catch (e) {
        const error = e as { code?: string; status?: number };
        if (error.code === 'INVALID_TRANSITION' || error.status === 404 || error.status === 403) {
          this.rideOver.set(true); // completed / cancelled meanwhile: nothing more to send
          this.buffer = [];
          return;
        }
        // No signal or a server error: keep EVERY point for the next try (the path must not
        // jump across the gap). Only past ~30 min of backlog are the oldest let go.
        this.buffer.unshift(...points);
        if (this.buffer.length > TRAIL_BACKLOG_MAX) this.buffer.splice(0, this.buffer.length - TRAIL_BACKLOG_MAX);
        return;
      }
    }
  }

  /**
   * A point for the trail? Skips vague fixes (they zigzag the line) and repeats of the same spot
   * (standing still), but always keeps one every 30 s so a long wait still shows where it was.
   */
  private keepForTrail(point: GeoPoint): boolean {
    const last = this.buffer[this.buffer.length - 1] ?? this.lastSent;
    if (!last) return true;
    const quiet = point.timestamp - last.timestamp >= 30_000;
    if (Number.isFinite(point.accuracyM) && point.accuracyM > TRAIL_MAX_ACCURACY_M && !quiet) return false;
    return quiet || distanceKm(last, point) * 1000 >= TRAIL_MIN_MOVE_M;
  }

  private markSent(point: GeoPoint): void {
    this.lastSent = point;
    this.lastSentAt = Date.now();
    this.sentPosition.set(point);
    this.sentAt.set(this.lastSentAt);
  }
}
