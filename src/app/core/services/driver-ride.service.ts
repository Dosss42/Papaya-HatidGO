import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { I18nService } from '../i18n/i18n.service';
import { DriverCancelReason, Earnings, Eligibility, Offer } from '../../shared/models/driver-ride.model';
import { Ride } from '../../shared/models/ride.model';
import { apiCall } from './api-call';

/** A ride step the driver takes (phase-0 § E.3); each has its own endpoint. */
export type DriverStep = 'depart' | 'arrive' | 'start' | 'reach-destination' | 'start-return' | 'complete';

/**
 * The driver's side of the ride API (Phases 8, 9, 11). Reading rides (active, one, history)
 * goes through RideService, which serves both roles.
 * @throws ApiError on every failure (NOT_ELIGIBLE with the checklist in data, RIDE_TAKEN, OFFER_GONE, …)
 */
@Injectable({ providedIn: 'root' })
export class DriverRideService {
  private readonly http = inject(HttpClient);
  private readonly i18n = inject(I18nService);
  private readonly base = environment.apiUrl;

  /** Online / offline. Going online sends the position too, so matching can use it at once. */
  availability(online: boolean, at?: { lat: number; lng: number }): Promise<{ is_online: boolean } & Eligibility> {
    return this.call(this.http.patch<{ data: { is_online: boolean } & Eligibility }>(`${this.base}/drivers/me/availability`, {
      is_online: online,
      ...(at ? { lat: at.lat, lng: at.lng } : {}),
    }));
  }

  eligibility(): Promise<Eligibility> {
    return this.call(this.http.get<{ data: Eligibility }>(`${this.base}/drivers/me/eligibility`));
  }

  /**
   * The open requests, whether the SERVER still has this driver online (meta.is_online), and
   * how far this phone's clock is from the server's (ms to ADD to Date.now(); expiry is the server's).
   */
  /**
   * My ringing offers, plus the request board (after Phase 13): open requests nearby the driver
   * may choose. Board entries have no offer yet (offer_id null from the API); they get
   * offer_id = -ride_id here, one key that never collides with a real offer's id.
   */
  offers(): Promise<{ offers: Offer[]; board: Offer[]; isOnline: boolean; clockOffsetMs: number }> {
    return apiCall(
      this.http
        .get<{ data: Offer[]; meta: { is_online: boolean; server_now?: string; board?: Offer[] } }>(`${this.base}/drivers/me/offers`)
        .pipe(map((r) => ({
          offers: r.data,
          board: (r.meta?.board ?? []).map((o) => ({ ...o, offer_id: -o.ride_id })),
          isOnline: r.meta?.is_online ?? true,
          clockOffsetMs: r.meta?.server_now ? Date.parse(r.meta.server_now) - Date.now() : 0,
        }))),
      (k) => this.i18n.t(k),
    );
  }

  accept(rideId: number): Promise<Ride> {
    return this.call(this.http.post<{ data: Ride }>(`${this.base}/rides/${rideId}/accept`, {}));
  }

  decline(rideId: number): Promise<void> {
    return this.call(this.http.post<{ data: unknown }>(`${this.base}/rides/${rideId}/decline`, {})).then(() => undefined);
  }

  step(rideId: number, step: DriverStep): Promise<Ride> {
    return this.call(this.http.post<{ data: Ride }>(`${this.base}/rides/${rideId}/${step}`, {}));
  }

  /** Balikan: the passenger never came back (reason required, audited). */
  endAtDestination(rideId: number, reason: string): Promise<Ride> {
    return this.call(this.http.post<{ data: Ride }>(`${this.base}/rides/${rideId}/end-at-destination`, { reason }));
  }

  cancel(rideId: number, reason: DriverCancelReason): Promise<Ride> {
    return this.call(this.http.post<{ data: Ride }>(`${this.base}/rides/${rideId}/cancel`, { reason }));
  }

  /** The idle ping while online (every 60 s or 100 m). */
  location(at: { lat: number; lng: number }): Promise<void> {
    return this.call(this.http.post<{ data: unknown }>(`${this.base}/drivers/me/location`, at)).then(() => undefined);
  }

  /** The route trail during a ride (every ~10 s, in batches). */
  trail(rideId: number, points: { lat: number; lng: number; accuracy_m: number | null; recorded_at: string }[]): Promise<void> {
    return this.call(this.http.post<{ data: unknown }>(`${this.base}/rides/${rideId}/locations`, { points })).then(() => undefined);
  }

  earnings(period: Earnings['period']): Promise<Earnings> {
    return this.call(this.http.get<{ data: Earnings }>(`${this.base}/drivers/me/earnings`, { params: { period } }));
  }

  private call<T>(request: Observable<{ data: T }>): Promise<T> {
    return apiCall(request.pipe(map((r) => r.data)), (k) => this.i18n.t(k));
  }
}
