import { BookingOptions } from '../../shared/models/ride.model';
import { distanceKm, insideArea, tooClose, townCenter } from './booking-checks';

const options: BookingOptions = {
  ride_types: ['one_way', 'two_way'],
  service_area: { center_lat: 15.35, center_lng: 121.05, radius_km: 8 },
  min_distance_m: 100,
  wait_choices: [15, 30, 60],
  request_timeout_seconds: 120,
};

describe('booking-checks (Phase 10)', () => {
  it('measures like the server (Haversine)', () => {
    expect(distanceKm({ lat: 15, lng: 121 }, { lat: 16, lng: 121 })).toBeCloseTo(111.19, 1);
    expect(distanceKm({ lat: 15.35, lng: 121.05 }, { lat: 15.37, lng: 121.05 })).toBeCloseTo(2.22, 2);
  });

  it('flags pins outside the service area (E1) and trips that are too short (E2)', () => {
    expect(insideArea(options, { lat: 15.35, lng: 121.05 })).toBe(true);
    expect(insideArea(options, { lat: 15.5, lng: 121.05 })).toBe(false); // ~16.7 km away
    expect(tooClose(options, { lat: 15.35, lng: 121.05 }, { lat: 15.3505, lng: 121.05 })).toBe(true); // ~56 m
    expect(tooClose(options, { lat: 15.35, lng: 121.05 }, { lat: 15.352, lng: 121.05 })).toBe(false); // ~222 m
  });

  it('opens on the town center when there is no location', () => {
    expect(townCenter(options)).toEqual({ lat: 15.35, lng: 121.05 });
  });
});
