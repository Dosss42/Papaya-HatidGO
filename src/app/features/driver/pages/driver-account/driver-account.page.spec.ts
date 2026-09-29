import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DriverAccountPage } from './driver-account.page';

describe('DriverAccountPage', () => {
  let component: DriverAccountPage;
  let fixture: ComponentFixture<DriverAccountPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(DriverAccountPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
