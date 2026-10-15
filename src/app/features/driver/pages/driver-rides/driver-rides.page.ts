import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon, IonRefresher, IonRefresherContent, IonSpinner, ViewWillEnter } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { alertCircle, checkmarkCircle, chevronForward, closeCircle, receiptOutline, timeOutline } from 'ionicons/icons';
import { TranslatePipe } from '../../../../core/i18n/t.pipe';
import { RideService } from '../../../../core/services/ride.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { StatusChipComponent } from '../../../../shared/components/status-chip/status-chip.component';
import { Ride } from '../../../../shared/models/ride.model';
import { peso, phDateTime } from '../../../../shared/utilities/subscription-view';
import { ChipKind } from '../../requirement-view';

/** Rides (Phase 11): the passengers this driver carried, newest first; tap one for its details. */
@Component({
  selector: 'app-driver-rides',
  templateUrl: './driver-rides.page.html',
  styleUrls: ['../../../passenger/pages/passenger-rides/passenger-rides.page.scss'],
  imports: [IonContent, IonIcon, IonRefresher, IonRefresherContent, IonSpinner, RouterLink, EmptyStateComponent, StatusChipComponent, TranslatePipe],
})
export class DriverRidesPage implements ViewWillEnter {
  private readonly rides = inject(RideService);

  protected readonly list = signal<Ride[] | null>(null);
  protected readonly failed = signal(false);
  protected readonly peso = peso;
  protected readonly dateTime = phDateTime;

  constructor() {
    addIcons({ alertCircle, checkmarkCircle, chevronForward, closeCircle, receiptOutline, timeOutline });
  }

  ionViewWillEnter(): void {
    void this.load();
  }

  protected async load(event?: CustomEvent): Promise<void> {
    this.failed.set(false);
    try {
      this.list.set(await this.rides.history()); // the API returns the driver's own rides for a driver
    } catch {
      this.failed.set(true);
    } finally {
      (event?.target as HTMLIonRefresherElement | undefined)?.complete();
    }
  }

  protected chip(ride: Ride): { kind: ChipKind; key: 'rides.chip.completed' | 'rides.chip.cancelled' | 'rides.chip.active'; icon: string } {
    if (ride.status === 'completed') return { kind: 'ok', key: 'rides.chip.completed', icon: 'checkmark-circle' };
    if (ride.status === 'cancelled') return { kind: 'missing', key: 'rides.chip.cancelled', icon: 'close-circle' };
    return { kind: 'wait', key: 'rides.chip.active', icon: 'time-outline' };
  }
}
