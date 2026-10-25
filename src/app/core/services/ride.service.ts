import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { I18nService } from '../i18n/i18n.service';
import { BookingOptions, BookingRequest, CancelReason, Estimate, Ride, RideTrail, TripPoint } from '../../shared/models/ride.model';
import { apiCall } from './api-call';

type Wrapped<T> = Observable<{ data: T }>;

/**
 * Rides for the passenger (API: Phase 9). Pages never call the ride endpoints directly
 * (active-ride brief § 8: "everything goes through RideService").
 * @throws ApiError on every failure (FARE_CHANGED, ACTIVE_RIDE_EXISTS, SUBSCRIPTION_INACTIVE, NETWORK, …)
 */
@Injectable({ providedIn: 'root' })
export class RideService {
  private readonly http = inject(HttpClient);
  private readonly i18n = inject(I18nService);
  private readonly base = environment.apiUrl;

  bookingOptions(): Promise<BookingOptions> {
    return this.call(this.http.get<{ data: BookingOptions }>(`${this.base}/booking-options`));
  }

  /** Both ride types priced at once (the booking sheet compares them side by side). */
  estimate(pickup: TripPoint, destination: TripPoint, waitMinutes: number | null): Promise<Estimate> {
    return this.call(this.http.post<{ data: Estimate }>(`${this.base}/fare/estimate`, {
      pickup_lat: pickup.lat,
      pickup_lng: pickup.lng,
      destination_lat: destination.lat,
      destination_lng: destination.lng,
      wait_minutes: waitMinutes,
    }));
  }

  book(request: BookingRequest): Promise<Ride> {
    return this.call(this.http.post<{ data: Ride }>(`${this.base}/rides`, request));
  }

  /** The ride to resume, or null (the Book tab uses this to open the ride screen). */
  active(): Promise<Ride | null> {
    return this.call(this.http.get<{ data: Ride | null }>(`${this.base}/rides/active`));
  }

  /** The polling target (every 4 s on the ride screen). */
  get(id: number): Promise<Ride> {
    return this.call(this.http.get<{ data: Ride }>(`${this.base}/rides/${id}`));
  }

  /** The path the driver actually drove, oldest first, thinned to ≤ 300 points (Phase 12). Both roles. */
  trail(id: number): Promise<RideTrail> {
    return this.call(this.http.get<{ data: RideTrail }>(`${this.base}/rides/${id}/trail`));
  }

  history(page = 1): Promise<Ride[]> {
    return this.call(this.http.get<{ data: Ride[] }>(`${this.base}/rides`, { params: { page } }));
  }

  cancel(id: number, reason: CancelReason | null): Promise<Ride> {
    return this.call(this.http.post<{ data: Ride }>(`${this.base}/rides/${id}/cancel`, { reason }));
  }

  rate(id: number, score: number, comment: string | null): Promise<{ score: number; comment: string | null }> {
    return this.call(this.http.post<{ data: { score: number; comment: string | null } }>(`${this.base}/rides/${id}/rating`, { score, comment }));
  }

  /** "Pabalik na ako": tells the waiting driver; changes no status. */
  passengerReturning(id: number): Promise<Ride> {
    return this.call(this.http.post<{ data: Ride }>(`${this.base}/rides/${id}/passenger-returning`, {}));
  }

  /** Unwrap `{ data }`, with the app's timeout and error shape (api-call.ts). */
  private call<T>(request: Wrapped<T>): Promise<T> {
    return apiCall(request.pipe(map((r) => r.data)), (k) => this.i18n.t(k));
  }
}
