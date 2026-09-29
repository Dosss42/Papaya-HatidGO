import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DriverTabsPage } from './driver-tabs.page';

describe('DriverTabsPage', () => {
  let component: DriverTabsPage;
  let fixture: ComponentFixture<DriverTabsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(DriverTabsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
