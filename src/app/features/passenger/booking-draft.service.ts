import { Injectable, computed, signal } from '@angular/core';
import { Estimate, Ride, RideType, TripPoint } from '../../shared/models/ride.model';

export type BookingStep = 1 | 2 | 3;

/**
 * The booking in progress (booking brief § 5: "keep the draft silently; no dialog"). Kept in
 * MEMORY while the app runs: leaving the Book tab and coming back restores it, and "Mag-book
 * ulit" / "Baguhin ang booking" on the ride screen reuse it. Nothing is written to the phone.
 */
@Injectable({ providedIn: 'root' })
export class BookingDraftService {
  readonly step = signal<BookingStep>(1);
  readonly pickup = signal<TripPoint | null>(null);
  readonly destination = signal<TripPoint | null>(null);
  readonly rideType = signal<RideType | null>(null);
  /** Balikan stay in minutes; null = "Hindi pa sigurado" (only meaningful once Balikan is chosen). */
  readonly waitMinutes = signal<number | null>(null);
  readonly waitChosen = signal(false);
  readonly note = signal('');
  readonly estimate = signal<Estimate | null>(null);

  /** The option card the passenger chose, with its total for the Mag-book button. */
  readonly chosen = computed(() => this.estimate()?.options.find((o) => o.ride_type === this.rideType()) ?? null);

  /** Ready to book: a type chosen and, for Balikan, a stay chosen (brief: button disabled until then). */
  readonly ready = computed(() => !!this.chosen() && (this.rideType() !== 'two_way' || this.waitChosen()));

  /**
   * "Mag-book ulit" / "Baguhin ang booking" on the ride screen: the same trip, back at step 3
   * (the fare is asked again there, since it may have changed).
   */
  fromRide(ride: Ride): void {
    const point = (p: Ride['pickup']): TripPoint => ({ lat: +p.lat, lng: +p.lng, landmark: p.landmark ?? '' });
    this.pickup.set(point(ride.pickup));
    this.destination.set(point(ride.destination));
    this.rideType.set(ride.ride_type);
    this.waitMinutes.set(ride.wait_minutes);
    this.waitChosen.set(ride.ride_type === 'two_way');
    this.note.set(ride.passenger_note ?? '');
    this.estimate.set(null);
    this.step.set(3);
  }

  /** A fresh booking after a finished ride: the pins go, the passenger starts at step 1 again. */
  reset(): void {
    this.step.set(1);
    this.pickup.set(null);
    this.destination.set(null);
    this.rideType.set(null);
    this.waitMinutes.set(null);
    this.waitChosen.set(false);
    this.note.set('');
    this.estimate.set(null);
  }
}
