import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { Subscription, SubscriptionSummary } from '../../shared/models/subscription.model';
import { ApiError } from '../../shared/utilities/api-error';
import { SubscriptionService } from './subscription.service';

const api = environment.apiUrl;
const tick = () => new Promise((resolve) => setTimeout(resolve));

const period = (status: Subscription['status']): Subscription => ({
  id: 7,
  status,
  plan: { id: 4, code: 'drv_1m', name: 'Driver · 1 month', user_type: 'driver', duration_months: 1, price: '199.00', currency: 'PHP', benefits: null },
  amount: '199.00',
  starts_at: null,
  ends_at: null,
  cancelled_at: null,
  created_at: '2026-10-02T00:00:00Z',
  payment: null,
});

const summary = (status: SubscriptionSummary['status']): SubscriptionSummary => ({
  status,
  active_until: null,
  remaining_days: 0,
  current: null,
  renewal: null,
  pending: null,
  test_mode: true,
});

describe('SubscriptionService (Phase 8)', () => {
  let http: HttpTestingController;
  let subs: SubscriptionService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    subs = TestBed.inject(SubscriptionService);
  });

  afterEach(() => http.verify());

  it('keeps the current status as a signal', async () => {
    const done = subs.loadCurrent();
    http.expectOne(`${api}/subscriptions/current`).flush({ data: summary('active') });
    await done;

    expect(subs.isActive()).toBe(true);
    subs.clear();
    expect(subs.summary()).toBeNull();
  });

  it('starts a checkout with the plan id and returns the page to pay on', async () => {
    const done = subs.start(4);
    const req = http.expectOne(`${api}/subscriptions`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ plan_id: 4 });
    req.flush({ data: { subscription: period('pending'), checkout_url: 'https://checkout.paymongo.com/cs_1' } }, { status: 201, statusText: 'Created' });

    expect((await done).checkout_url).toBe('https://checkout.paymongo.com/cs_1');
  });

  it('confirm() keeps asking the server until the period is no longer pending', async () => {
    const done = subs.confirm(7, [0, 0, 0]);

    http.expectOne(`${api}/subscriptions/7`).flush({ data: period('pending') });
    await tick();
    http.expectOne(`${api}/subscriptions/7`).flush({ data: period('active') });
    await tick();
    http.expectOne(`${api}/subscriptions/current`).flush({ data: summary('active') }); // refreshed for the gates

    expect((await done).status).toBe('active');
    expect(subs.isActive()).toBe(true);
  });

  it('confirm() gives up after the last try and reports still pending', async () => {
    const done = subs.confirm(7, [0, 0]);

    http.expectOne(`${api}/subscriptions/7`).flush({ data: period('pending') });
    await tick();
    http.expectOne(`${api}/subscriptions/7`).flush({ data: period('pending') });
    await tick();
    http.expectOne(`${api}/subscriptions/current`).flush({ data: summary('none') });

    expect((await done).status).toBe('pending');
  });

  it('turns a refusal into the app error shape', async () => {
    const done = subs.start(1);
    http.expectOne(`${api}/subscriptions`).flush(
      { message: "This plan isn't for your account.", code: 'PLAN_NOT_FOR_YOU', errors: {} },
      { status: 422, statusText: 'Unprocessable Content' },
    );

    await expect(done).rejects.toMatchObject({ code: 'PLAN_NOT_FOR_YOU' } satisfies Partial<ApiError>);
  });
});
