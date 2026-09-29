import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PassengerAccountPage } from './passenger-account.page';

describe('PassengerAccountPage', () => {
  let component: PassengerAccountPage;
  let fixture: ComponentFixture<PassengerAccountPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PassengerAccountPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
