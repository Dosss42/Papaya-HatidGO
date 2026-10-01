import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DriverHomePage } from './driver-home.page';

describe('DriverHomePage', () => {
  let component: DriverHomePage;
  let fixture: ComponentFixture<DriverHomePage>;

  beforeEach(() => {
    // The page uses links (router) and, through its services, HTTP: give it test versions.
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(DriverHomePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
