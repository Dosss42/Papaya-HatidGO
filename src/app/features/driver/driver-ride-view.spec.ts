import { Offer } from '../../shared/models/driver-ride.model';
import { Ride } from '../../shared/models/ride.model';
import {
  byNearest, canEndAtDestination, countdown, directionsUrl, driverCanCancel, driverLine, driverReasonKey, headingTo, nextStep,
  offlineReason,
} from './driver-ride-view';

const ride = (over: Partial<Ride> = {}): Ride =>
  ({
    id: 1,
    reference_no: 'HG-000001',
    ride_type: 'one_way',
    status: 'accepted',
    current_leg: null,
    wait_minutes: 30,
    pickup: { lat: '15.35', lng: '121.05', landmark: 'Munisipyo' },
    destination: { lat: '15.37', lng: '121.05', landmark: 'Palengke' },
    passenger_note: null,
    distance_km: '2.22',
    return_distance_km: null,
    fare: { outbound_fare: '52.20', return_fare: null, waiting_fee: '0.00', service_fee: '0.00', estimated_total: '52.20', total: '52.20', is_final: false },
    waiting_minutes: null,
    passenger_returning_at: null,
    times: {} as Ride['times'],
    cancelled_by: null,
    cancel_reason: null,
    driver: null,
    vehicle: null,
    rating: null,
    passenger: { first_name: 'Maria', phone: '09170000001' },
    ...over,
  }) as Ride;

const two = (leg: Ride['current_leg']) => ride({ ride_type: 'two_way', status: 'in_progress', current_leg: leg });

describe('driver-ride-view (Phase 11)', () => {
  it('gives ONE next step per status, One-way and Balikan', () => {
    expect(nextStep(ride())?.step).toBe('depart');
    expect(nextStep(ride({ status: 'driver_arriving' }))?.step).toBe('arrive');
    expect(nextStep(ride({ status: 'arrived' }))?.step).toBe('start');
    expect(nextStep(ride({ status: 'in_progress' }))).toEqual({ step: 'complete', key: 'drive.step.complete' });
    expect(nextStep(two('outbound'))?.step).toBe('reach-destination');
    expect(nextStep(two('waiting'))?.step).toBe('start-return');
    expect(nextStep(two('return'))?.step).toBe('complete');
    expect(nextStep(ride({ status: 'completed' }))).toBeNull();
    expect(nextStep(ride({ status: 'cancelled' }))).toBeNull();
  });

  it("tells the driver what to do, with the passenger's first name", () => {
    expect(driverLine(ride())).toEqual({ key: 'drive.line.accepted', params: { passenger: 'Maria' } });
    expect(driverLine(two('waiting')).key).toBe('drive.line.waiting');
    expect(driverLine(two('return')).key).toBe('drive.line.returning');
    expect(driverLine(ride({ status: 'cancelled', cancelled_by: 'passenger' })).key).toBe('drive.line.cancelledPassenger');
    expect(driverLine(ride({ status: 'cancelled', cancelled_by: 'driver' })).key).toBe('drive.line.cancelledYou');
  });

  it('allows cancel only before the trip, and "end here" only while waiting on a Balikan', () => {
    expect(driverCanCancel(ride({ status: 'arrived' }))).toBe(true);
    expect(driverCanCancel(ride({ status: 'in_progress' }))).toBe(false);
    expect(canEndAtDestination(two('waiting'))).toBe(true);
    expect(canEndAtDestination(two('outbound'))).toBe(false);
  });

  it('heads to the pickup, then the destination, then back to the pickup', () => {
    expect(headingTo(ride())).toBe('pickup');
    expect(headingTo(two('outbound'))).toBe('destination');
    expect(headingTo(two('waiting'))).toBe('destination'); // waiting there
    expect(headingTo(ride({ status: 'completed' }))).toBeNull();
    expect(headingTo(two('return'))).toBe('pickup');
    expect(directionsUrl('15.35', '121.05')).toContain('destination=15.35,121.05');
  });

  it('translates only the stable reason codes', () => {
    expect(driverReasonKey('vehicle_problem')).toBe('drive.reason.vehicle_problem');
    expect(driverReasonKey('Nasiraan')).toBeNull();
    expect(driverReasonKey(null)).toBeNull();
  });

  it('counts down to the real expiry, never below 0:00', () => {
    const now = Date.parse('2026-10-15T02:00:00Z');
    expect(countdown('2026-10-15T02:01:24Z', now)).toBe('1:24');
    expect(countdown('2026-10-15T02:00:05Z', now)).toBe('0:05');
    expect(countdown('2026-10-15T01:59:00Z', now)).toBe('0:00');
  });

  it('shows the nearest pickup first', () => {
    const offer = (id: number, km: number | null) => ({ offer_id: id, pickup: { distance_from_you_km: km } }) as Offer;
    expect(byNearest([offer(1, 1.2), offer(2, null), offer(3, 0.4)]).map((o) => o.offer_id)).toEqual([3, 1, 2]);
  });

  it("names the first failed check as the offline reason, else a stale location", () => {
    const checks = (failed: string | null) => ({
      eligible: failed === null,
      checks: ['account_active', 'compliance_verified', 'vehicle_verified', 'subscription_active'].map((key) => ({ key, passed: key !== failed })),
    }) as never;
    expect(offlineReason(checks('subscription_active'))).toEqual({
      key: 'drive.off.subscription',
      link: { url: '/driver/subscription', key: 'drive.off.subscriptionGo' },
    });
    expect(offlineReason(checks('compliance_verified')).link?.url).toBe('/driver/requirements');
    expect(offlineReason(checks('account_active')).link).toBeNull();
    expect(offlineReason(checks(null)).key).toBe('drive.off.stale');
    expect(offlineReason(null).key).toBe('drive.off.stale');
  });
});
