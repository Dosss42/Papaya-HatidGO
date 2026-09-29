import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DriverEarningsPage } from './driver-earnings.page';

describe('DriverEarningsPage', () => {
  let component: DriverEarningsPage;
  let fixture: ComponentFixture<DriverEarningsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(DriverEarningsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
