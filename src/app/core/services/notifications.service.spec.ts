import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { NotificationsService } from './notifications.service';

const api = environment.apiUrl;
const page = (unread: number) => ({ data: [], meta: { current_page: 1, last_page: 1, total: 0, unread } });

describe('NotificationsService (Phase 13)', () => {
  let http: HttpTestingController;
  let alerts: NotificationsService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    alerts = TestBed.inject(NotificationsService);
  });

  afterEach(() => {
    alerts.stop();
    http.verify();
  });

  it('in the browser there is no push, but the list and badge still work', async () => {
    expect(alerts.permission()).toBe('unsupported');

    void alerts.start('passenger');
    http.expectOne(`${api}/notifications/unread-count`).flush({ data: { unread: 3 } });
    await new Promise((r) => setTimeout(r)); // let the answer reach the badge

    expect(alerts.unread()).toBe(3);
    expect(alerts.askNow()).toBe(false); // nothing to ask in a browser
  });

  it('reading the list updates the badge from the server count', async () => {
    const done = alerts.list(2);
    const req = http.expectOne((r) => r.url === `${api}/notifications`);
    expect(req.request.params.get('page')).toBe('2');
    req.flush(page(5));

    await done;
    expect(alerts.unread()).toBe(5);
  });

  it('marking one or all as read counts the badge down (with the server count, not a guess)', async () => {
    alerts.unread.set(2);
    const one = alerts.markRead('abc');
    const req = http.expectOne(`${api}/notifications/abc/read`);
    expect(req.request.method).toBe('PATCH');
    req.flush({ data: { id: 'abc', read_at: '2026-10-26T10:00:00Z' } });
    await one;
    await new Promise((r) => setTimeout(r));
    http.expectOne(`${api}/notifications/unread-count`).flush({ data: { unread: 1 } });
    await new Promise((r) => setTimeout(r));
    expect(alerts.unread()).toBe(1);

    const all = alerts.markAllRead();
    http.expectOne(`${api}/notifications/read-all`).flush({ data: { unread: 0 } });
    await all;
    expect(alerts.unread()).toBe(0);
  });

  it('keeps the last badge number when offline', async () => {
    alerts.unread.set(4);
    const done = alerts.refreshUnread();
    http.expectOne(`${api}/notifications/unread-count`).error(new ProgressEvent('error'));
    await done;

    expect(alerts.unread()).toBe(4);
  });

  it('leads to screens of the logged-in role only, and forgets everything at logout', async () => {
    expect(alerts.urlFor('ride:3')).toBeNull(); // nobody logged in

    void alerts.start('driver');
    http.expectOne(`${api}/notifications/unread-count`).flush({ data: { unread: 1 } });
    await new Promise((r) => setTimeout(r)); // let the answer reach the badge
    expect(alerts.urlFor('ride:3')).toBe('/driver/ride/3');

    alerts.stop();
    expect(alerts.unread()).toBe(0);
    expect(alerts.urlFor('ride:3')).toBeNull();
  });
});
