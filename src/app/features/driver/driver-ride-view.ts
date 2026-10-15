import { MessageKey } from '../../core/i18n/messages.en';
import { DriverStep } from '../../core/services/driver-ride.service';
import { DriverCancelReason, Eligibility, Offer } from '../../shared/models/driver-ride.model';
import { Ride } from '../../shared/models/ride.model';
import { Line } from '../passenger/ride-view';

/**
 * What the driver's screens show (Phase 11), as plain functions: the ride screen's status line
 * and its ONE next step, the request countdown, and the forced-offline reason. Easy to test;
 * the pages stay thin.
 */

/** The driver's status line: what to do now, with the passenger's first name. */
export function driverLine(ride: Ride): Line {
  const passenger = ride.passenger?.first_name ?? '';
  switch (ride.status) {
    case 'requested':
    case 'accepted':
      return { key: 'drive.line.accepted', params: { passenger } };
    case 'driver_arriving':
      return { key: 'drive.line.arriving', params: { passenger } };
    case 'arrived':
      return { key: 'drive.line.arrived', params: { passenger } };
    case 'in_progress':
      if (ride.current_leg === 'waiting') return { key: 'drive.line.waiting', params: { passenger } };
      if (ride.current_leg === 'return') return { key: 'drive.line.returning', params: { passenger } };
      return { key: 'drive.line.toDestination', params: { passenger } };
    case 'completed':
      return { key: 'drive.line.completed' };
    case 'cancelled':
      switch (ride.cancelled_by) {
        case 'passenger':
          return { key: 'drive.line.cancelledPassenger' };
        case 'driver':
          return { key: 'drive.line.cancelledYou' };
        default:
          return { key: 'ride.line.cancelledAdmin' };
      }
  }
}

/** The ONE primary button per status (decision #1): which endpoint, and its label. */
export function nextStep(ride: Ride): { step: DriverStep; key: MessageKey } | null {
  switch (ride.status) {
    case 'accepted':
      return { step: 'depart', key: 'drive.step.depart' };
    case 'driver_arriving':
      return { step: 'arrive', key: 'drive.step.arrive' };
    case 'arrived':
      return { step: 'start', key: 'drive.step.start' };
    case 'in_progress':
      if (ride.ride_type === 'one_way') return { step: 'complete', key: 'drive.step.complete' };
      switch (ride.current_leg) {
        case 'waiting':
          return { step: 'start-return', key: 'drive.step.startReturn' };
        case 'return':
          return { step: 'complete', key: 'drive.step.complete' };
        default:
          return { step: 'reach-destination', key: 'drive.step.reachDestination' };
      }
    default:
      return null;
  }
}

/** A driver may cancel an accepted ride until the trip starts (API decision #3). */
export function driverCanCancel(ride: Ride): boolean {
  return ['accepted', 'driver_arriving', 'arrived'].includes(ride.status);
}

/** Balikan, waiting: "the passenger never came back" ends the ride here (outbound + waiting fee). */
export function canEndAtDestination(ride: Ride): boolean {
  return ride.status === 'in_progress' && ride.ride_type === 'two_way' && ride.current_leg === 'waiting';
}

/**
 * The place that matters now: the pickup (before the trip, and on the way back) or the
 * destination (on the way there, and while waiting there on a Balikan).
 */
export function headingTo(ride: Ride): 'pickup' | 'destination' | null {
  if (['accepted', 'driver_arriving', 'arrived'].includes(ride.status)) return 'pickup';
  if (ride.status !== 'in_progress') return null;
  return ride.current_leg === 'return' ? 'pickup' : 'destination';
}

/** Google Maps directions to a point (opens the Maps app on Android; no API key). */
export function directionsUrl(lat: string | number, lng: string | number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
}

export const DRIVER_CANCEL_REASONS: DriverCancelReason[] = ['vehicle_problem', 'passenger_not_found', 'passenger_no_show', 'other'];

/**
 * The driver's reason as the PASSENGER reads it: the stable codes are translated; anything else
 * (older rides, an admin's free text) is shown as written.
 */
export function driverReasonKey(reason: string | null): MessageKey | null {
  return reason && (DRIVER_CANCEL_REASONS as string[]).includes(reason) ? (`drive.reason.${reason}` as MessageKey) : null;
}

/** "1:24": the REAL time left before the request expires (brief § 4), never negative. */
export function countdown(expiresAt: string, now: number = Date.now()): string {
  const seconds = Math.max(0, Math.ceil((Date.parse(expiresAt) - now) / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/** Nearest pickup first (brief § 4 "Two requests at once"); unknown distances last. */
export function byNearest(offers: Offer[]): Offer[] {
  return [...offers].sort(
    (a, b) => (a.pickup.distance_from_you_km ?? Number.MAX_VALUE) - (b.pickup.distance_from_you_km ?? Number.MAX_VALUE),
  );
}

export interface OfflineReason {
  key: MessageKey;
  /** The next step's screen, with its button label; null when Mag-online is the next step. */
  link: { url: string; key: MessageKey } | null;
}

/**
 * Why the server refused / switched off the driver, from the go-online checklist (§ D.3): the
 * first failed check. All passing means the location went stale (phone asleep, no signal).
 */
export function offlineReason(eligibility: Eligibility | null | undefined): OfflineReason {
  const failed = eligibility?.checks.find((c) => !c.passed);
  switch (failed?.key) {
    case 'account_active':
      return { key: 'drive.off.suspended', link: null };
    case 'compliance_verified':
      return { key: 'drive.off.documents', link: { url: '/driver/requirements', key: 'drive.off.documentsGo' } };
    case 'vehicle_verified':
      return { key: 'drive.off.vehicle', link: { url: '/driver/vehicle', key: 'drive.off.vehicleGo' } };
    case 'subscription_active':
      return { key: 'drive.off.subscription', link: { url: '/driver/subscription', key: 'drive.off.subscriptionGo' } };
    default:
      return { key: 'drive.off.stale', link: null };
  }
}
