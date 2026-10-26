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
  let alert: { unlock: ReturnType<typeof vi.fn>; start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn>; once: ReturnType<typeof vi.fn> };
  let location: { startIdle: ReturnType<typeof vi.fn>; startRide: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> };
  let i18n: I18nService;

  beforeEach(() => {
    gps = { checkPermission: vi.fn(async () => 'granted'), getCurrentPosition: vi.fn(async () => fix) };
    alert = { unlock: vi.fn(), start: vi.fn(), stop: vi.fn(), once: vi.fn() };
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
            ...location, retryNow: vi.fn(), gpsLost: signal(false), sentPosition: signal(null), serverOffline: signal(false), rideOver: signal(false), sentAt: signal(null),
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
  async function online(offers: Offer[] = [], board: Offer[] = []): Promise<void> {
    const going = shift.goOnline();
    await settle();
    const patch = http.expectOne(`${api}/drivers/me/availability`);
    expect(patch.request.body).toEqual({ is_online: true, lat: fix.lat, lng: fix.lng });
    patch.flush({ data: { is_online: true, eligible: true, checks: [] } });
    await going;
    http.expectOne(`${api}/drivers/me/offers`).flush({ data: offers, meta: { is_online: true, board } });
    await settle();
  }

  /** A request on the board, as the API sends it: no offer yet (offer_id null). */
  const onBoard = (id: number, km: number): Offer => ({ ...offer(id, km), offer_id: null as unknown as number });

  it('lists the request board without ringing; choosing opens it quietly; skipping declines nothing (after Phase 13)', async () => {
    await online([], [onBoard(5, 4.0)]);

    expect(shift.board().map((o) => o.offer_id)).toEqual([-50]); // its own key: minus the ride id
    expect(shift.shown()).toBeNull();
    expect(alert.start).not.toHaveBeenCalled();

    shift.choose(shift.board()[0]);
    expect(shift.shown()?.ride_id).toBe(50);
    expect(alert.start).not.toHaveBeenCalled();

    shift.skip();
    expect(shift.shown()).toBeNull();
    expect(shift.board()).toEqual([]);
    http.expectNone(`${api}/rides/50/decline`); // no offer was made, so nothing to decline
  });

  it('auto-accepts the nearest request within the chosen radius, never one farther (after Phase 13)', async () => {
    shift.setAutoAccept(3);
    await online([], [onBoard(4, 4.0), onBoard(2, 2.0)]);

    // 2.0 km is within 3 km: accepted without a tap. 4.0 km is left on the board.
    const accept = http.expectOne(`${api}/rides/20/accept`);
    accept.flush({ data: { id: 20, status: 'accepted' } });
    await settle();
    expect(shift.rideId()).toBe(20);
    expect(location.startRide).toHaveBeenCalledWith(20);
    expect(alert.start).not.toHaveBeenCalled();
  });

  it('with auto-accept off, nothing is accepted by itself', async () => {
    shift.setAutoAccept(null);
    await online([], [onBoard(2, 1.0)]);

    http.expectNone(`${api}/rides/20/accept`);
    expect(shift.board()).toHaveLength(1);
  });

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

  it('lists requests nearest first, rings once, and never opens one by itself (the list decides)', async () => {
    await online([offer(1, 1.5), offer(2, 0.3)]);
    expect(shift.offers().map((o) => o.offer_id)).toEqual([2, 1]);
    expect(shift.shown()).toBeNull(); // no popup: the driver chooses from the list
    expect(alert.once).toHaveBeenCalledTimes(1);
    expect(alert.start).not.toHaveBeenCalled(); // no repeating ring

    const polled = shift.poll(); // the same requests again: no second ring
    http.expectOne(`${api}/drivers/me/offers`).flush({ data: [offer(1, 1.5), offer(2, 0.3)], meta: { is_online: true } });
    await polled;
    expect(alert.once).toHaveBeenCalledTimes(1);
  });

  it('Laktawan declines the chosen request and leaves the rest in the list', async () => {
    await online([offer(1, 1.5), offer(2, 0.3)]);
    shift.choose(shift.offers()[0]);
    shift.skip();
    expect(shift.shown()).toBeNull();
    expect(shift.offers().map((o) => o.offer_id)).toEqual([1]);
    http.expectOne(`${api}/rides/20/decline`).flush({ data: null });
  });

  it('says "taken" when another driver accepted first', async () => {
    await online([offer(1, 0.3)]);
    shift.choose(shift.offers()[0]);
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
    shift.choose(shift.offers()[0]);
    const polled = shift.poll();
    http.expectOne(`${api}/drivers/me/offers`).flush({ data: [], meta: { is_online: true } });
    await polled;
    await settle();
    expect(shift.outcome()).toBe('gone');
  });

  it('accepting starts the ride: no more offers, the trail instead', async () => {
    await online([offer(1, 0.3)]);
    shift.choose(shift.offers()[0]);
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
    shift.choose(shift.offers()[0]);
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
    expect(shift.offers()[0]?.offer_id).toBe(1); // still listed: not treated as expired
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
