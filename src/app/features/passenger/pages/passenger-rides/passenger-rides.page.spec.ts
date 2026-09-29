import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PassengerRidesPage } from './passenger-rides.page';

describe('PassengerRidesPage', () => {
  let component: PassengerRidesPage;
  let fixture: ComponentFixture<PassengerRidesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PassengerRidesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
