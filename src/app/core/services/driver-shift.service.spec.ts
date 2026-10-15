import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { Offer } from '../../shared/models/driver-ride.model';
import { GeoPoint, LocationError } from '../../shared/models/location.model';
import { I18nService } from '../i18n/i18n.service';
import { AppLifecycleService } from './app-lifecycle.service';
import { DriverLocationService } from './driver-location.service';
import { DriverShiftService } from './driver-shift.service';
import { LocationService } from './location.service';
import { RequestAlertService } from './request-alert.service';

const api = environment.apiUrl;
const fix: GeoPoint = { lat: 15.3501, lng: 121.0501, accuracyM: 8, timestamp: Date.now() };
/** Let pending promises (and the HTTP calls they start) run. */
const settle = () => new Promise((resolve) => setTimeout(resolve));

const offer = (id: number, km: number, inSeconds = 60): Offer =>
  ({
    offer_id: id,
    ride_id: id * 10,
    expires_at: new Date(Date.now() + inSeconds * 1000).toISOString(),
    ride_type: 'one_way',
    wait_minutes: null,
    estimated_total: '52.20',
    distance_km: '2.22',
    pickup: { lat: '15.35', lng: '121.05', landmark: 'Munisipyo', distance_from_you_km: km },
    destination: { lat: '15.37', lng: '121.05', landmark: 'Palengke' },
    passenger_note: null,
  }) as Offer;

describe('DriverShiftService (Phase 11)', () => {
  let http: HttpTestingController;
  let shift: DriverShiftService;
  let gps: { checkPermission: ReturnType<typeof vi.fn>; getCurrentPosition: ReturnType<typeof vi.fn> };
  let alert: { unlock: ReturnType<typeof vi.fn>; start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> };
  let location: { startIdle: ReturnType<typeof vi.fn>; startRide: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> };
  let i18n: I18nService;

  beforeEach(() => {
    gps = { checkPermission: vi.fn(async () => 'granted'), getCurrentPosition: vi.fn(async () => fix) };
    alert = { unlock: vi.fn(), start: vi.fn(), stop: vi.fn() };
    location = { startIdle: vi.fn(async () => undefined), startRide: vi.fn(async () => undefined), stop: vi.fn(async () => undefined) };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '**', children: [] }]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LocationService, useValue: gps },
        { provide: RequestAlertService, useValue: alert },
        { provide: AppLifecycleService, useValue: { isActive: signal(true) } },
        {
          provide: DriverLocationService,
          useValue: {
            ...location, retryNow: vi.fn(), gpsLost: signal(false), sentPosition: signal(null), serverOffline: signal(false), rideOver: signal(false),
          },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    shift = TestBed.inject(DriverShiftService);
    i18n = TestBed.inject(I18nService);
  });

  afterEach(() => shift.reset());

  /** Mag-online → GPS fix → PATCH accepted → the first offers poll answered with `offers`. */
  async function online(offers: Offer[] = []): Promise<void> {
    const going = shift.goOnline();
    await settle();
    const patch = http.expectOne(`${api}/drivers/me/availability`);
    expect(patch.request.body).toEqual({ is_online: true, lat: fix.lat, lng: fix.lng });
    patch.flush({ data: { is_online: true, eligible: true, checks: [] } });
    await going;
    http.expectOne(`${api}/drivers/me/offers`).flush({ data: offers, meta: { is_online: true } });
    await settle();
  }

  it('goes online with a real position, unlocks the tone in the tap, and starts the idle location', async () => {
    await online();
    expect(alert.unlock).toHaveBeenCalled();
    expect(shift.state()).toBe('online');
    expect(location.startIdle).toHaveBeenCalledWith(fix);
  });

  it("stays offline with the server's reason and the next step when not eligible", async () => {
    const going = shift.goOnline();
    await settle();
    http.expectOne(`${api}/drivers/me/availability`).flush(
      {
        message: 'Not eligible',
        code: 'NOT_ELIGIBLE',
        data: { eligible: false, checks: [{ key: 'account_active', passed: true }, { key: 'subscription_active', passed: false, action: 'renew_subscription' }] },
      },
      { status: 403, statusText: 'Forbidden' },
    );
    await going;

    expect(shift.state()).toBe('offline');
    expect(shift.goError()).toEqual({
      message: i18n.t('drive.off.subscription'),
      link: { url: '/driver/subscription', key: 'drive.off.subscriptionGo' },
    });
  });

  it('never asks the server without a GPS fix', async () => {
    gps.getCurrentPosition.mockRejectedValueOnce(new LocationError('GPS_OFF'));
    await shift.goOnline();

    http.expectNone(`${api}/drivers/me/availability`);
    expect(shift.state()).toBe('offline');
    expect(shift.goError()?.message).toBe(i18n.t('location.GPS_OFF'));
  });

  it('shows the nearest request first, rings, and counts the others', async () => {
    await online([offer(1, 1.5), offer(2, 0.3)]);
    expect(shift.shown()?.offer_id).toBe(2);
    expect(shift.queued()).toBe(1);
    expect(alert.start).toHaveBeenCalled();
  });

  it('Laktawan declines and moves to the next request', async () => {
    await online([offer(1, 1.5), offer(2, 0.3)]);
    shift.skip();
    expect(shift.shown()?.offer_id).toBe(1);
    http.expectOne(`${api}/rides/20/decline`).flush({ data: null });
  });

  it('says "taken" when another driver accepted first', async () => {
    await online([offer(1, 0.3)]);
    const accepting = shift.accept();
    http.expectOne(`${api}/rides/10/accept`).flush(
      { message: 'Taken', code: 'RIDE_TAKEN' },
      { status: 409, statusText: 'Conflict' },
    );
    await accepting;
    expect(shift.outcome()).toBe('taken');
    expect(alert.stop).toHaveBeenCalled();
  });

  it('says "gone" when the request disappears while on screen', async () => {
    await online([offer(1, 0.3)]);
    const polled = shift.poll();
    http.expectOne(`${api}/drivers/me/offers`).flush({ data: [], meta: { is_online: true } });
    await polled;
    await settle();
    expect(shift.outcome()).toBe('gone');
  });

  it('accepting starts the ride: no more offers, the trail instead', async () => {
    await online([offer(1, 0.3)]);
    const accepting = shift.accept();
    http.expectOne(`${api}/rides/10/accept`).flush({ data: { id: 10, status: 'accepted' } });
    await accepting;
    expect(shift.rideId()).toBe(10);
    expect(shift.shown()).toBeNull();
    expect(location.startRide).toHaveBeenCalledWith(10);
  });

  it('is told when the server switched it off, with the reason', async () => {
    await online();
    const polled = shift.poll();
    http.expectOne(`${api}/drivers/me/offers`).flush({ data: [], meta: { is_online: false } });
    await settle();
    http.expectOne(`${api}/drivers/me/eligibility`).flush({
      data: { eligible: false, checks: [{ key: 'compliance_verified', passed: false, action: 'complete_requirements' }] },
    });
    await polled;

    expect(shift.state()).toBe('offline');
    expect(shift.forced()?.key).toBe('drive.off.documents');
    expect(location.stop).toHaveBeenCalled();
  });

  it('a lost accept answer: if the server gave the ride to this driver, it opens instead of "gone"', async () => {
    await online([offer(1, 0.3)]);
    const accepting = shift.accept();
    http.expectOne(`${api}/rides/10/accept`).error(new ProgressEvent('timeout')); // no answer (status 0)
    await settle();
    http.expectOne(`${api}/rides/active`).flush({ data: { id: 10, status: 'accepted' } });
    await accepting;
    expect(shift.rideId()).toBe(10);
    expect(shift.outcome()).toBeNull();
  });

  it("counts expiry on the server's clock, not the phone's", async () => {
    // The phone's clock runs 5 minutes FAST: the offer (60 s left on the server) must still show.
    const going = shift.goOnline();
    await settle();
    http.expectOne(`${api}/drivers/me/availability`).flush({ data: { is_online: true, eligible: true, checks: [] } });
    await going;
    const serverNow = new Date(Date.now() - 5 * 60_000);
    const live = { ...offer(1, 0.3), expires_at: new Date(serverNow.getTime() + 60_000).toISOString() };
    http.expectOne(`${api}/drivers/me/offers`).flush({ data: [live], meta: { is_online: true, server_now: serverNow.toISOString() } });
    await settle();
    expect(shift.shown()?.offer_id).toBe(1);
  });

  it('shows "No internet" only after two failed checks in a row, and clears it on the next success', async () => {
    await online();
    for (const _ of [1, 2]) {
      const polled = shift.poll();
      http.expectOne(`${api}/drivers/me/offers`).error(new ProgressEvent('offline'));
      await polled;
      if (_ === 1) expect(shift.connectionLost()).toBe(false); // one miss can be a blip
    }
    expect(shift.connectionLost()).toBe(true);
    const polled = shift.poll();
    http.expectOne(`${api}/drivers/me/offers`).flush({ data: [], meta: { is_online: true } });
    await polled;
    expect(shift.connectionLost()).toBe(false);
  });

  it('Mag-offline tells the server', async () => {
    await online();
    const going = shift.goOffline();
    const req = http.expectOne(`${api}/drivers/me/availability`);
    expect(req.request.body).toEqual({ is_online: false });
    req.flush({ data: { is_online: false, eligible: true, checks: [] } });
    await going;
    expect(shift.state()).toBe('offline');
  });
});
