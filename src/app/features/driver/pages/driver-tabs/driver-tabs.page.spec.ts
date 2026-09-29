import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DriverTabsPage } from './driver-tabs.page';

describe('DriverTabsPage', () => {
  let component: DriverTabsPage;
  let fixture: ComponentFixture<DriverTabsPage>;

  beforeEach(() => {
    // The page uses links (router) and, through AuthService, HTTP: give it test versions.
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(DriverTabsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
