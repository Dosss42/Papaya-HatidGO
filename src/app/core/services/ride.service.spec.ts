import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { ApiError } from '../../shared/utilities/api-error';
import { RideService } from './ride.service';

const api = environment.apiUrl;

describe('RideService (Phase 10)', () => {
  let http: HttpTestingController;
  let rides: RideService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    rides = TestBed.inject(RideService);
  });

  afterEach(() => http.verify());

  it('asks for both fares with the pins and the Balikan stay', async () => {
    const done = rides.estimate({ lat: 15.35, lng: 121.05, landmark: 'A' }, { lat: 15.37, lng: 121.05, landmark: 'B' }, 30);

    const req = http.expectOne(`${api}/fare/estimate`);
    expect(req.request.body).toEqual({ pickup_lat: 15.35, pickup_lng: 121.05, destination_lat: 15.37, destination_lng: 121.05, wait_minutes: 30 });
    req.flush({ data: { distance_km: '2.22', options: [] } });

    expect((await done).distance_km).toBe('2.22');
  });

  it('books with the total the passenger saw', async () => {
    const done = rides.book({
      pickup_lat: 15.35, pickup_lng: 121.05, pickup_landmark: null,
      destination_lat: 15.37, destination_lng: 121.05, destination_landmark: 'Palengke',
      ride_type: 'one_way', wait_minutes: null, passenger_note: null, expected_total: '52.20',
    });

    const req = http.expectOne(`${api}/rides`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.expected_total).toBe('52.20');
    req.flush({ data: { id: 7, status: 'requested' } }, { status: 201, statusText: 'Created' });

    expect((await done).id).toBe(7);
  });

  it('keeps the new estimate of a FARE_CHANGED refusal', async () => {
    const done = rides.book({} as never);
    http.expectOne(`${api}/rides`).flush(
      { message: 'Nagbago ang pamasahe: ₱60.00.', code: 'FARE_CHANGED', data: { estimate: { ride_type: 'one_way', total: '60.00' } } },
      { status: 409, statusText: 'Conflict' },
    );

    const error = (await done.catch((e) => e)) as ApiError;
    expect(error.code).toBe('FARE_CHANGED');
    expect((error.data?.['estimate'] as { total: string }).total).toBe('60.00');
  });

  it('sends the cancel reason as a stable code', async () => {
    const done = rides.cancel(7, 'changed_plans');
    const req = http.expectOne(`${api}/rides/7/cancel`);
    expect(req.request.body).toEqual({ reason: 'changed_plans' });
    req.flush({ data: { id: 7, status: 'cancelled' } });

    expect((await done).status).toBe('cancelled');
  });

  it('reads the active ride (or none)', async () => {
    const done = rides.active();
    http.expectOne(`${api}/rides/active`).flush({ data: null });
    expect(await done).toBeNull();
  });
});
