import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { DriverEarningsPage } from './driver-earnings.page';

describe('DriverEarningsPage (Phase 11)', () => {
  let fixture: ComponentFixture<DriverEarningsPage>;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DriverEarningsPage);
    fixture.detectChanges();
  });

  it('shows the total and the rides of the chosen period', async () => {
    fixture.componentInstance.ionViewWillEnter();
    http.expectOne(`${environment.apiUrl}/drivers/me/earnings?period=day`).flush({
      data: {
        period: 'day', from: '2026-10-15', to: '2026-10-15', total: '104.40', rides_count: 2,
        rides: [{ id: 9, reference_no: 'HG-000009', ride_type: 'one_way', total: '52.20', completed_at: '2026-10-15T02:00:00Z' }],
      },
    });
    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('104.40');
    expect(text).toContain('HG-000009');
  });
});
