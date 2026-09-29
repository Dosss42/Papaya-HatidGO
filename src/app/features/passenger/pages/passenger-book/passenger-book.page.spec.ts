import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PassengerBookPage } from './passenger-book.page';

describe('PassengerBookPage', () => {
  let component: PassengerBookPage;
  let fixture: ComponentFixture<PassengerBookPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PassengerBookPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
