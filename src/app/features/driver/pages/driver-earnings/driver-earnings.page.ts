import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon, IonRefresher, IonRefresherContent, IonSpinner, ViewWillEnter } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { alertCircle, chevronForward, walletOutline } from 'ionicons/icons';
import { TranslatePipe } from '../../../../core/i18n/t.pipe';
import { DriverRideService } from '../../../../core/services/driver-ride.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { Earnings } from '../../../../shared/models/driver-ride.model';
import { peso, phDateTime } from '../../../../shared/utilities/subscription-view';

type Period = Earnings['period'];

/**
 * Earnings (Phase 11 decision #8): the cash from completed rides, by Philippine calendar day,
 * Monday–Sunday week, or month. The total is the largest thing; the rides behind it below.
 */
@Component({
  selector: 'app-driver-earnings',
  templateUrl: './driver-earnings.page.html',
  styleUrls: ['./driver-earnings.page.scss', '../../../passenger/pages/passenger-rides/passenger-rides.page.scss'],
  imports: [IonContent, IonIcon, IonRefresher, IonRefresherContent, IonSpinner, RouterLink, EmptyStateComponent, TranslatePipe],
})
export class DriverEarningsPage implements ViewWillEnter {
  private readonly api = inject(DriverRideService);

  protected readonly periods: { value: Period; key: 'earnings.day' | 'earnings.week' | 'earnings.month' }[] = [
    { value: 'day', key: 'earnings.day' },
    { value: 'week', key: 'earnings.week' },
    { value: 'month', key: 'earnings.month' },
  ];
  protected readonly period = signal<Period>('day');
  protected readonly data = signal<Earnings | null>(null);
  protected readonly loading = signal(false);
  protected readonly failed = signal(false);
  protected readonly peso = peso;
  protected readonly dateTime = phDateTime;

  constructor() {
    addIcons({ alertCircle, chevronForward, walletOutline });
  }

  ionViewWillEnter(): void {
    void this.load();
  }

  protected choose(period: Period): void {
    if (period === this.period()) return;
    this.period.set(period);
    this.data.set(null);
    void this.load();
  }

  protected async load(event?: CustomEvent): Promise<void> {
    const period = this.period();
    this.loading.set(true);
    this.failed.set(false);
    try {
      const data = await this.api.earnings(period);
      if (period === this.period()) this.data.set(data); // ignore a late answer for another tab
    } catch {
      this.failed.set(true);
    } finally {
      this.loading.set(false);
      (event?.target as HTMLIonRefresherElement | undefined)?.complete();
    }
  }
}
