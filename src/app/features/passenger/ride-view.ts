import { MessageKey } from '../../core/i18n/messages.en';
import { Ride } from '../../shared/models/ride.model';

/**
 * What the passenger's ride screen shows for each status (active-ride brief § 3), in ONE
 * place, as plain functions: easy to test, and the page stays thin.
 */

export interface Line {
  key: MessageKey;
  params?: Record<string, string | number>;
}

/** The status line: the largest text, readable in one glance. */
export function statusLine(ride: Ride): Line {
  const driver = ride.driver?.first_name ?? '';
  switch (ride.status) {
    case 'requested':
      return { key: 'ride.line.searching' };
    case 'accepted':
    case 'driver_arriving':
      return { key: 'ride.line.arriving', params: { driver } };
    case 'arrived':
      return { key: 'ride.line.arrived', params: { driver } };
    case 'in_progress':
      if (ride.current_leg === 'waiting') return { key: 'ride.line.waiting', params: { driver } };
      if (ride.current_leg === 'return') return { key: 'ride.line.returning' };
      return { key: 'ride.line.toDestination' };
    case 'completed':
      return { key: 'ride.line.completed' };
    case 'cancelled':
      switch (ride.cancelled_by) {
        case 'system':
          return { key: 'ride.line.noDriver' };
        case 'driver':
          return { key: 'ride.line.cancelledDriver' };
        case 'admin':
          return { key: 'ride.line.cancelledAdmin' };
        default:
          return { key: 'ride.line.cancelledYou' };
      }
  }
}

export type StageState = 'done' | 'current' | 'todo';
export interface Stage {
  key: MessageKey;
  state: StageState;
}

/**
 * The stage track: 4 stages for One-way, 6 for Balikan (brief § 3). A status that jumped
 * between polls simply fills the skipped stages. None while cancelled.
 */
export function stages(ride: Ride): Stage[] {
  if (ride.status === 'cancelled') return [];
  const keys: MessageKey[] =
    ride.ride_type === 'two_way'
      ? ['ride.stage.searching', 'ride.stage.arriving', 'ride.stage.arrived', 'ride.stage.outbound', 'ride.stage.waiting', 'ride.stage.return']
      : ['ride.stage.searching', 'ride.stage.arriving', 'ride.stage.arrived', 'ride.stage.trip'];

  const current = ride.status === 'completed' ? keys.length : currentStage(ride);
  return keys.map((key, i) => ({ key, state: i < current ? 'done' : i === current ? 'current' : 'todo' }));
}

function currentStage(ride: Ride): number {
  switch (ride.status) {
    case 'requested':
      return 0;
    case 'accepted':
    case 'driver_arriving':
      return 1;
    case 'arrived':
      return 2;
    default: // in_progress
      if (ride.ride_type !== 'two_way') return 3;
      return { outbound: 3, waiting: 4, return: 5 }[ride.current_leg ?? 'outbound'];
  }
}

/** Kanselahin is shown only until the trip starts (hidden, not disabled, afterwards: brief § 5). */
export function canCancel(ride: Ride): boolean {
  return ['requested', 'accepted', 'driver_arriving', 'arrived'].includes(ride.status);
}

export function isOver(ride: Ride): boolean {
  return ride.status === 'completed' || ride.status === 'cancelled';
}

/** The driver card shows from accepted until the ride is over (brief § 4). */
export function showDriverCard(ride: Ride): boolean {
  return !!ride.driver && !isOver(ride);
}

/** "JD" for Juan Dela Cruz: the avatar (no profile photos in the MVP). */
export function initials(first: string, last: string): string {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

/** Whole minutes from an ISO time to now (never negative). */
export function minutesSince(iso: string | null, now: number = Date.now()): number {
  return iso ? Math.max(0, Math.floor((now - Date.parse(iso)) / 60_000)) : 0;
}

/** Completed with a final fare different from the estimate: "Tantya ₱85 → Final ₱95". */
export function fareChanged(ride: Ride): boolean {
  return ride.fare.is_final && ride.fare.total !== ride.fare.estimated_total;
}

/** "Pabalik na ako" was used less than 5 minutes ago: the button shows "Nasabihan na si …". */
export const RETURNING_COOLDOWN_MS = 5 * 60_000;
export function returningCooling(ride: Ride, now: number = Date.now()): boolean {
  return !!ride.passenger_returning_at && now - Date.parse(ride.passenger_returning_at) < RETURNING_COOLDOWN_MS;
}
