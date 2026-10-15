import { Component, OnDestroy, computed, effect, inject, signal } from '@angular/core';
import { IonIcon, IonModal, IonSpinner } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { alertCircle, chatbubbleEllipsesOutline, closeCircle, flagOutline, navigateCircleOutline } from 'ionicons/icons';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../../core/i18n/t.pipe';
import { DriverShiftService } from '../../../../core/services/driver-shift.service';
import { Offer } from '../../../../shared/models/driver-ride.model';
import { peso } from '../../../../shared/utilities/subscription-view';
import { countdown } from '../../driver-ride-view';

/**
 * The incoming request (driver-home brief § 4): a full-screen takeover over any driver tab, with
 * the tone + vibration (RequestAlertService), the REAL countdown to expires_at, and everything
 * needed to decide in a few seconds. Skip on the left, Accept (larger) on the right.
 * System Back = Laktawan (Back always works, and never accepts by accident).
 */
@Component({
  selector: 'app-request-alert',
  templateUrl: './request-alert.component.html',
  styleUrls: ['./request-alert.component.scss'],
  imports: [IonIcon, IonModal, IonSpinner, TranslatePipe],
})
export class RequestAlertComponent implements OnDestroy {
  protected readonly shift = inject(DriverShiftService);
  private readonly i18n = inject(I18nService);
  private ticker: ReturnType<typeof setInterval> | null = null;

  /** Follows shift.shown(), but Back can close it before the service catches up. */
  protected readonly open = signal(false);
  protected readonly now = signal(Date.now());
  protected readonly peso = peso;

  protected readonly offer = this.shift.shown;
  protected readonly timeLeft = computed(() => {
    const offer = this.offer();
    return offer ? countdown(offer.expires_at, this.now()) : '';
  });

  constructor() {
    addIcons({ alertCircle, chatbubbleEllipsesOutline, closeCircle, flagOutline, navigateCircleOutline });

    effect(() => {
      const offer = this.offer();
      this.open.set(!!offer);
      if (offer) this.startTicker();
      else this.stopTicker();
    });
  }

  ngOnDestroy(): void {
    this.stopTicker();
  }

  /** On the server's clock (shift.now()), so a phone with a wrong clock still counts honestly. */
  private startTicker(): void {
    this.now.set(this.shift.now());
    this.ticker ??= setInterval(() => {
      this.now.set(this.shift.now());
      const offer = this.offer();
      if (offer && Date.parse(offer.expires_at) <= this.now()) this.shift.expired();
    }, 1000);
  }

  private stopTicker(): void {
    if (this.ticker) clearInterval(this.ticker);
    this.ticker = null;
  }

  /** Closed by system Back (or by the service, when shown() is already null). */
  protected onDismiss(): void {
    this.open.set(false);
    if (this.offer()) this.shift.skip();
  }

  protected typeText(offer: Offer): string {
    if (offer.ride_type === 'one_way') return this.i18n.t('book.oneWay');
    if (offer.wait_minutes === null) return this.i18n.t('offer.twoWayUnsure');
    const wait = offer.wait_minutes === 60 ? this.i18n.t('book.wait60') : this.i18n.t('book.waitMin', { n: offer.wait_minutes });
    return this.i18n.t('offer.twoWayWait', { wait });
  }

  /** 0.8 / 2.4: one decimal is enough to decide. */
  protected km(value: number | string | null): string {
    return value === null ? '?' : (Math.round(Number(value) * 10) / 10).toFixed(1);
  }
}
