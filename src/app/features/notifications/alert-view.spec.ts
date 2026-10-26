import { alertIcon, badgeText, showWhileOpen, targetUrl } from './alert-view';

describe('alert-view (Phase 13)', () => {
  it('turns a server target into a screen of the right area', () => {
    expect(targetUrl('passenger', 'ride:12')).toBe('/passenger/ride/12');
    expect(targetUrl('driver', 'ride:12')).toBe('/driver/ride/12');
    expect(targetUrl('driver', 'requirement:drivers_license')).toBe('/driver/requirements/drivers_license');
    expect(targetUrl('driver', 'requirements')).toBe('/driver/requirements');
    expect(targetUrl('passenger', 'subscription')).toBe('/passenger/subscription');
    expect(targetUrl('driver', 'subscription')).toBe('/driver/subscription');
    expect(targetUrl('driver', 'home')).toBe('/driver/home');
    expect(targetUrl('passenger', 'home')).toBe('/passenger/book');
  });

  it('opens the Alerts list for anything unknown or not for this role', () => {
    expect(targetUrl('passenger', null)).toBe('/passenger/alerts');
    expect(targetUrl('passenger', 'something-new:3')).toBe('/passenger/alerts');
    expect(targetUrl('passenger', 'requirement:drivers_license')).toBe('/passenger/alerts');
    expect(targetUrl('driver', 'ride:')).toBe('/driver/rides');
  });

  it('picks an icon by what the alert is about', () => {
    expect(alertIcon('ride_cancelled_by_driver')).toBe('tricycle');
    expect(alertIcon('passenger_returning')).toBe('tricycle');
    expect(alertIcon('document_expiring')).toBe('document-text-outline');
    expect(alertIcon('driver_offline_stale')).toBe('power-outline');
    expect(alertIcon('payment_expired')).toBe('card-outline');
    expect(alertIcon('subscription_ended')).toBe('card-outline');
    expect(alertIcon('anything_else')).toBe('notifications-outline');
  });

  it('caps the badge at 9+', () => {
    expect(badgeText(3)).toBe('3');
    expect(badgeText(9)).toBe('9');
    expect(badgeText(10)).toBe('9+');
  });

  it('stays quiet while open about requests and the ride already on screen', () => {
    expect(showWhileOpen('ride_offer', 'home', '/driver/home')).toBe(false);
    expect(showWhileOpen('ride_arrived', 'ride:7', '/passenger/ride/7')).toBe(false);
    expect(showWhileOpen('ride_arrived', 'ride:7', '/passenger/ride/71')).toBe(true); // a different ride
    expect(showWhileOpen('ride_arrived', 'ride:7', '/passenger/book')).toBe(true);
    expect(showWhileOpen('document_approved', 'requirement:clearance', '/driver/home')).toBe(true);
  });
});
