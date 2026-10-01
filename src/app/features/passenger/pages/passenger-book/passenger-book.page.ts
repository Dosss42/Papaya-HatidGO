import { Component, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';
import { IonContent, IonIcon, IonInput, IonSpinner, ViewWillEnter } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { alertCircle, cardOutline, constructOutline, location } from 'ionicons/icons';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../../core/i18n/t.pipe';
import { AppLifecycleService } from '../../../../core/services/app-lifecycle.service';
import { SubscriptionService } from '../../../../core/services/subscription.service';
import { OfflineNoticeComponent } from '../../../../shared/components/offline-notice/offline-notice.component';
import { endingSoon, peso, phDate } from '../../../../shared/utilities/subscription-view';

/**
 * Booking step 1 (design-briefs/passenger-booking.md § 4). Phase 8 adds the GATE: without an
 * active subscription the screen says so and offers Subscribe (the API refuses bookings too,
 * `subscribed` middleware). The map and booking itself arrive in Phase 10.
 */
@Component({
  selector: 'app-passenger-book',
  templateUrl: './passenger-book.page.html',
  styleUrls: ['./passenger-book.page.scss'],
  imports: [IonContent, IonIcon, IonInput, IonSpinner, OfflineNoticeComponent, RouterLink, TranslatePipe],
})
export class PassengerBookPage implements ViewWillEnter {
  private readonly subs = inject(SubscriptionService);
  private readonly i18n = inject(I18nService);
  private readonly router = inject(Router);
  private readonly lifecycle = inject(AppLifecycleService);

  /** The cheapest monthly price, for "Plans start at ₱49 a month". */
  private readonly fromPrice = signal<string | null>(null);
  protected readonly checked = computed(() => this.subs.summary() !== null);
  protected readonly subscribed = computed(() => this.subs.isActive());

  protected readonly gateText = computed(() =>
    this.fromPrice() ? this.i18n.t('book.gate', { price: this.fromPrice()! }) : this.i18n.t('sub.lead.passenger'),
  );

  protected readonly endingText = computed(() => {
    const summary = this.subs.summary();
    return endingSoon(summary) && summary?.active_until ? this.i18n.t('sub.endingSoon', { date: phDate(summary.active_until) }) : null;
  });

  constructor() {
    addIcons({ alertCircle, cardOutline, constructOutline, location });

    // Back from the Subscription page (outside the tabs) doesn't fire ionViewWillEnter: listen to the router.
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe((e) => {
        if (e.urlAfterRedirects.startsWith('/passenger/book')) void this.refresh();
      });
    effect(() => {
      if (this.lifecycle.isActive()) void this.refresh();
    });
  }

  ionViewWillEnter(): void {
    void this.refresh();
  }

  private async refresh(): Promise<void> {
    try {
      const summary = await this.subs.loadCurrent();
      if (summary.status !== 'active' && !this.fromPrice()) {
        const monthly = (await this.subs.plans()).find((p) => p.duration_months === 1);
        this.fromPrice.set(monthly ? peso(monthly.price) : null);
      }
    } catch {
      // Offline: the offline notice explains; the gate shows again once the status is known.
    }
  }
}
