import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DriverRidesPage } from './driver-rides.page';

describe('DriverRidesPage', () => {
  let component: DriverRidesPage;
  let fixture: ComponentFixture<DriverRidesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(DriverRidesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
