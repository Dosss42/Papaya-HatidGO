import { STALE_AFTER_MS, ageNow, ageText, easeOut, isStale, lerpPoint, rideLines, samePoint } from './map-geometry';

const pickup = { lat: 15.35, lng: 121.05 };
const destination = { lat: 15.37, lng: 121.05 };
const driver = { lat: 15.351, lng: 121.051 };

describe('map-geometry (Phase 12)', () => {
  it('glides along a straight line, easing out, never past either end', () => {
    expect(lerpPoint(pickup, destination, 0.5)).toEqual({ lat: 15.36, lng: 121.05 });
    expect(lerpPoint(pickup, destination, -1)).toEqual(pickup);
    expect(lerpPoint(pickup, destination, 2)).toEqual(destination);
    expect(easeOut(0)).toBe(0);
    expect(easeOut(1)).toBe(1);
    expect(easeOut(0.5)).toBeGreaterThan(0.5); // fast start, gentle stop
  });

  it("ages a position on one clock: the server's age at receipt + the time since, on this phone", () => {
    const received = 1_000_000;
    expect(ageNow(10, received, received + 5_000)).toBe(15_000);
    expect(ageNow(null, received, received)).toBeNull();
    expect(ageNow(0, received, received - 500)).toBe(0); // never negative
  });

  it('calls a position stale after 45 s, or when its age is unknown', () => {
    expect(isStale(30_000)).toBe(false);
    expect(isStale(STALE_AFTER_MS + 1000)).toBe(true);
    expect(isStale(null)).toBe(true);
  });

  it('says how old a position is', () => {
    expect(ageText(40_000)).toEqual({ key: 'ride.agoSec', n: 40 });
    expect(ageText(150_000)).toEqual({ key: 'ride.agoMin', n: 2 });
    expect(ageText(-500).n).toBe(0);
  });

  it('draws the route always, and the approach only while the driver is coming with a live position', () => {
    expect(rideLines('requested', pickup, destination, null, true, null)).toEqual({ route: [pickup, destination], approach: null, trail: null });
    expect(rideLines('accepted', pickup, destination, driver, false, null).approach).toEqual([driver, pickup]);
    expect(rideLines('driver_arriving', pickup, destination, driver, true, null).approach).toBeNull(); // stale: no line from the wrong place
    expect(rideLines('arrived', pickup, destination, driver, false, null).approach).toBeNull();
    expect(rideLines('in_progress', pickup, destination, driver, false, null)).toEqual({ route: [pickup, destination], approach: null, trail: null });
  });

  it('shows the driven path once the ride is over, else the planned route', () => {
    const driven = [pickup, { lat: 15.36, lng: 121.052 }, destination];
    expect(rideLines('completed', pickup, destination, null, true, driven)).toEqual({ route: null, approach: null, trail: driven });
    expect(rideLines('completed', pickup, destination, null, true, [pickup]).route).toEqual([pickup, destination]); // one point is no path
    expect(rideLines('cancelled', pickup, destination, null, true, null).trail).toBeNull();
  });

  it('treats points within ~1 m as the same place', () => {
    expect(samePoint(pickup, { lat: 15.350001, lng: 121.050001 })).toBe(true);
    expect(samePoint(pickup, driver)).toBe(false);
    expect(samePoint(null, null)).toBe(true);
    expect(samePoint(pickup, null)).toBe(false);
  });
});
