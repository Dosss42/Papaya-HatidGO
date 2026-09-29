import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PassengerTabsPage } from './passenger-tabs.page';

describe('PassengerTabsPage', () => {
  let component: PassengerTabsPage;
  let fixture: ComponentFixture<PassengerTabsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PassengerTabsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
