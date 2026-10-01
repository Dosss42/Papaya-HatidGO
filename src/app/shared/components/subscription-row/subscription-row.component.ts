import { Component, OnInit, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { cardOutline, chevronForward } from 'ionicons/icons';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../core/i18n/t.pipe';
import { SubscriptionService } from '../../../core/services/subscription.service';
import { subscriptionChip } from '../../utilities/subscription-view';

/**
 * Account › Subscription (Phase 8), for passengers and drivers: the current status in words
 * (Active / Not subscribed / …) and a link to the Subscription page.
 */
@Component({
  selector: 'app-subscription-row',
  imports: [IonIcon, RouterLink, TranslatePipe],
  template: `
    <a class="hg-menu__row" [routerLink]="link()">
      <ion-icon name="card-outline" aria-hidden="true" />
      <span class="hg-menu__label">{{ 'account.subscription' | t }}</span>
      <span class="subscription-row__value">{{ status() }}</span>
      <ion-icon class="hg-menu__go" name="chevron-forward" aria-hidden="true" />
    </a>
  `,
  styles: `
    :host { display: block; }
    .subscription-row__value { font-weight: 400; color: var(--hg-ink-soft); }
  `,
})
export class SubscriptionRowComponent implements OnInit {
  /** /driver/subscription or /passenger/subscription */
  readonly link = input.required<string>();

  private readonly subs = inject(SubscriptionService);
  private readonly i18n = inject(I18nService);

  protected readonly status = computed(() => (this.subs.summary() ? this.i18n.t(subscriptionChip(this.subs.summary()).key) : ''));

  constructor() {
    addIcons({ cardOutline, chevronForward });
  }

  ngOnInit(): void {
    void this.subs.loadCurrent().catch(() => undefined); // offline: the row simply shows no status
  }
}
