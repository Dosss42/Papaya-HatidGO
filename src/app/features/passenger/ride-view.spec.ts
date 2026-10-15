import { Ride } from '../../shared/models/ride.model';
import { canCancel, fareChanged, initials, minutesSince, returningCooling, showDriverCard, stages, statusLine } from './ride-view';

const ride = (over: Partial<Ride> = {}): Ride =>
  ({
    id: 1,
    reference_no: 'HG-000001',
    ride_type: 'one_way',
    status: 'requested',
    current_leg: null,
    wait_minutes: null,
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
    driver: { first_name: 'Juan', last_name: 'Dela Cruz', phone: '09170000011', rating: { average: null, count: 0 }, location: null },
    vehicle: { plate_number: 'ABC1234', body_number: '127', color: 'Pula', make: null, model: null },
    rating: null,
    ...over,
  }) as Ride;

describe('ride-view (Phase 10)', () => {
  it('says what is happening for every status', () => {
    expect(statusLine(ride({ driver: null })).key).toBe('ride.line.searching');
    expect(statusLine(ride({ status: 'accepted' }))).toEqual({ key: 'ride.line.arriving', params: { driver: 'Juan' } });
    expect(statusLine(ride({ status: 'driver_arriving' })).key).toBe('ride.line.arriving');
    expect(statusLine(ride({ status: 'arrived' })).key).toBe('ride.line.arrived');
    expect(statusLine(ride({ status: 'in_progress' })).key).toBe('ride.line.toDestination');
    expect(statusLine(ride({ status: 'in_progress', ride_type: 'two_way', current_leg: 'waiting' })).key).toBe('ride.line.waiting');
    expect(statusLine(ride({ status: 'in_progress', ride_type: 'two_way', current_leg: 'return' })).key).toBe('ride.line.returning');
    expect(statusLine(ride({ status: 'completed' })).key).toBe('ride.line.completed');
    expect(statusLine(ride({ status: 'cancelled', cancelled_by: 'system' })).key).toBe('ride.line.noDriver');
    expect(statusLine(ride({ status: 'cancelled', cancelled_by: 'driver' })).key).toBe('ride.line.cancelledDriver');
    expect(statusLine(ride({ status: 'cancelled', cancelled_by: 'passenger' })).key).toBe('ride.line.cancelledYou');
  });

  it('tracks 4 stages for One-way and 6 for Balikan, filling skipped ones', () => {
    expect(stages(ride()).map((s) => s.state)).toEqual(['current', 'todo', 'todo', 'todo']);
    expect(stages(ride({ status: 'arrived' })).map((s) => s.state)).toEqual(['done', 'done', 'current', 'todo']); // jumped from requested
    expect(stages(ride({ status: 'completed' })).every((s) => s.state === 'done')).toBe(true);

    const waiting = stages(ride({ ride_type: 'two_way', status: 'in_progress', current_leg: 'waiting' }));
    expect(waiting).toHaveLength(6);
    expect(waiting.map((s) => s.state)).toEqual(['done', 'done', 'done', 'done', 'current', 'todo']);
    expect(stages(ride({ status: 'cancelled' }))).toEqual([]);
  });

  it('allows cancelling only before the trip starts, and shows the driver card only while active', () => {
    expect(['requested', 'accepted', 'driver_arriving', 'arrived'].every((s) => canCancel(ride({ status: s as Ride['status'] })))).toBe(true);
    expect(canCancel(ride({ status: 'in_progress' }))).toBe(false);
    expect(showDriverCard(ride({ status: 'accepted' }))).toBe(true);
    expect(showDriverCard(ride({ status: 'completed' }))).toBe(false);
    expect(showDriverCard(ride({ status: 'requested', driver: null }))).toBe(false);
  });

  it('formats the small things', () => {
    expect(initials('juan', 'dela cruz')).toBe('JD');
    expect(minutesSince('2026-10-11T10:00:00Z', Date.parse('2026-10-11T10:12:30Z'))).toBe(12);
    expect(minutesSince(null)).toBe(0);
    expect(fareChanged(ride({ fare: { ...ride().fare, is_final: true, total: '62.20' } }))).toBe(true);
    expect(fareChanged(ride({ fare: { ...ride().fare, is_final: true } }))).toBe(false);
  });

  it('keeps "Pabalik na ako" quiet for 5 minutes after it was used', () => {
    const now = Date.parse('2026-10-11T10:10:00Z');
    expect(returningCooling(ride({ passenger_returning_at: '2026-10-11T10:07:00Z' }), now)).toBe(true);
    expect(returningCooling(ride({ passenger_returning_at: '2026-10-11T10:04:00Z' }), now)).toBe(false);
    expect(returningCooling(ride(), now)).toBe(false);
  });
});
