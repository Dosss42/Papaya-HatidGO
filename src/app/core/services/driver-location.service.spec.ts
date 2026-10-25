import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { GeoPoint } from '../../shared/models/location.model';
import { DriverLocationService } from './driver-location.service';
import { LocationService } from './location.service';

const api = environment.apiUrl;
const settle = () => new Promise((resolve) => setTimeout(resolve));
/** ~0.0009° latitude ≈ 100 m. */
const point = (northMetres: number): GeoPoint => ({ lat: 15.35 + northMetres / 111_320, lng: 121.05, accuracyM: 8, timestamp: Date.now() });

describe('DriverLocationService (Phase 11 cadence)', () => {
  let http: HttpTestingController;
  let service: DriverLocationService;
  let onUpdate: (p: GeoPoint) => void = () => undefined;
  let watchMs: number[] = [];

  beforeEach(() => {
    const watching = signal(false);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: LocationService,
          useValue: {
            watching,
            startWatch: async (cb: (p: GeoPoint) => void, _err: unknown, ms: number) => {
              onUpdate = cb;
              watchMs.push(ms);
              watching.set(true);
            },
            stopWatch: async () => watching.set(false),
            getCurrentPosition: async () => point(0),
          },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(DriverLocationService);
    watchMs = [];
  });

  afterEach(() => service.stop());

  it('while waiting, sends only after moving 100 m (or a minute)', async () => {
    await service.startIdle(point(0)); // the going-online fix counts as sent

    onUpdate(point(40));
    await settle();
    http.expectNone(`${api}/drivers/me/location`);

    onUpdate(point(150));
    await settle();
    const req = http.expectOne(`${api}/drivers/me/location`);
    expect(req.request.body.lat).toBeCloseTo(point(150).lat, 6);
    req.flush({ data: { location_updated_at: 'now' } });
    await settle();
    expect(service.sentPosition()?.lat).toBeCloseTo(point(150).lat, 6);
  });

  it('notices when the server already has the driver offline', async () => {
    await service.startIdle(point(0));
    onUpdate(point(200));
    await settle();
    http.expectOne(`${api}/drivers/me/location`).flush(
      { message: 'Not online', code: 'NOT_ONLINE' },
      { status: 409, statusText: 'Conflict' },
    );
    await settle();
    expect(service.serverOffline()).toBe(true);
  });

  it('during a ride, collects points for the trail instead of the idle ping', async () => {
    await service.startRide(10);
    onUpdate(point(50));
    onUpdate(point(300));
    await settle();
    http.expectNone(`${api}/drivers/me/location`);
  });

  it('records a point every ~3 s during a ride, but only every 10 s while waiting (battery)', async () => {
    await service.startIdle(point(0));
    await service.startRide(10);
    await service.startIdle();
    expect(watchMs).toEqual([10_000, 3_000, 10_000]); // the watch restarts with each mode
  });

  describe('the trail (Phase 12: the way the driver actually went)', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    const at = (northMetres: number, msLater: number, accuracyM = 8): GeoPoint => ({ ...point(northMetres), accuracyM, timestamp: Date.now() + msLater });
    const sentLats = (req: { request: { body: { points: { lat: number }[] } } }) => req.request.body.points.map((p) => +p.lat.toFixed(6));

    it('keeps the points along the way, skipping standing still and vague fixes', async () => {
      await service.startRide(10);
      onUpdate(at(0, 0));
      onUpdate(at(2, 3000)); // 2 m: standing still
      onUpdate(at(40, 6000, 120)); // ±120 m: would zigzag the line
      onUpdate(at(30, 9000));
      await vi.advanceTimersByTimeAsync(10_000);
      const req = http.expectOne(`${api}/rides/10/locations`);
      expect(sentLats(req)).toEqual([at(0, 0), at(30, 0)].map((p) => +p.lat.toFixed(6)));
      req.flush({ data: { saved: 2 } }, { status: 201, statusText: 'Created' });
    });

    it('keeps every point through a signal gap and sends them in order afterwards', async () => {
      await service.startRide(10);
      onUpdate(at(0, 0));
      onUpdate(at(20, 3000));
      await vi.advanceTimersByTimeAsync(10_000);
      http.expectOne(`${api}/rides/10/locations`).error(new ProgressEvent('offline')); // no signal
      await vi.advanceTimersByTimeAsync(0);

      onUpdate(at(40, 12_000));
      await vi.advanceTimersByTimeAsync(10_000);
      const req = http.expectOne(`${api}/rides/10/locations`);
      expect(sentLats(req)).toEqual([at(0, 0), at(20, 0), at(40, 0)].map((p) => +p.lat.toFixed(6))); // nothing lost, oldest first
      req.flush({ data: { saved: 3 } }, { status: 201, statusText: 'Created' });
    });
  });
});
