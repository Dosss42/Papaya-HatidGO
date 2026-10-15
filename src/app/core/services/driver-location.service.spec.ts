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
            startWatch: async (cb: (p: GeoPoint) => void) => {
              onUpdate = cb;
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
});
