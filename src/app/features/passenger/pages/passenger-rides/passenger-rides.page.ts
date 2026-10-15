import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon, IonRefresher, IonRefresherContent, IonSpinner, ViewWillEnter } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { alertCircle, checkmarkCircle, chevronForward, closeCircle, receiptOutline, starOutline, timeOutline } from 'ionicons/icons';
import { TranslatePipe } from '../../../../core/i18n/t.pipe';
import { RideService } from '../../../../core/services/ride.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { StatusChipComponent } from '../../../../shared/components/status-chip/status-chip.component';
import { Ride } from '../../../../shared/models/ride.model';
import { peso, phDateTime } from '../../../../shared/utilities/subscription-view';
import { ChipKind } from '../../../driver/requirement-view';

/**
 * Rides (Phase 10): the passenger's rides, newest first. Tap one for its details, where a
 * completed ride can still be rated ("Mamaya na" loses nothing, active-ride brief § 5).
 */
@Component({
  selector: 'app-passenger-rides',
  templateUrl: './passenger-rides.page.html',
  styleUrls: ['./passenger-rides.page.scss'],
  imports: [IonContent, IonIcon, IonRefresher, IonRefresherContent, IonSpinner, RouterLink, EmptyStateComponent, StatusChipComponent, TranslatePipe],
})
export class PassengerRidesPage implements ViewWillEnter {
  private readonly rides = inject(RideService);

  protected readonly list = signal<Ride[] | null>(null);
  protected readonly failed = signal(false);
  protected readonly peso = peso;
  /** "Oct 12 · 4:29 PM": several rides a day must be told apart (finish review). */
  protected readonly dateTime = phDateTime;

  constructor() {
    addIcons({ alertCircle, checkmarkCircle, chevronForward, closeCircle, receiptOutline, starOutline, timeOutline });
  }

  ionViewWillEnter(): void {
    void this.load();
  }

  protected async load(event?: CustomEvent): Promise<void> {
    this.failed.set(false);
    try {
      this.list.set(await this.rides.history());
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
