import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonBackButton, IonButtons, IonContent, IonHeader, IonIcon, IonSpinner, IonToolbar, ViewWillEnter } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  alertCircle, checkmarkCircle, chevronDown, chevronUp, ellipseOutline, informationCircleOutline, lockClosedOutline, timeOutline,
} from 'ionicons/icons';
import { I18nService } from '../../core/i18n/i18n.service';
import { MessageKey } from '../../core/i18n/messages.en';
import { TranslatePipe } from '../../core/i18n/t.pipe';
import { AuthService } from '../../core/services/auth.service';
import { NetworkService } from '../../core/services/network.service';
import { SubscriptionService } from '../../core/services/subscription.service';
import { OfflineNoticeComponent } from '../../shared/components/offline-notice/offline-notice.component';
import { PaymentRecord, Plan, Subscription } from '../../shared/models/subscription.model';
import { ApiError } from '../../shared/utilities/api-error';
import { monthsFree, peso, phDate } from '../../shared/utilities/subscription-view';

/** Where the page is in the payment flow (the status itself always comes from the server). */
type Phase = 'idle' | 'opening' | 'checking' | 'paid' | 'notYet' | 'cancelled';

/**
 * Subscription (Phase 8), for passengers AND drivers (/passenger/subscription, /driver/subscription):
 * the status · the plans (1 / 6 / 12 months) · ONE orange "Pay ₱…" button · the payment history.
 *
 * Paying: POST /subscriptions → PayMongo's page in a Custom Tab → back in the app → ASK the
 * server (confirm) → "Payment received!" only when the server says so (phase-0 § F.2 #1).
 */
@Component({
  selector: 'app-subscription',
  templateUrl: './subscription.page.html',
  styleUrls: ['./subscription.page.scss'],
  imports: [
    IonBackButton, IonButtons, IonContent, IonHeader, IonIcon, IonSpinner, IonToolbar,
    OfflineNoticeComponent, RouterLink, TranslatePipe,
  ],
})
export class SubscriptionPage implements ViewWillEnter {
  private readonly subs = inject(SubscriptionService);
  private readonly auth = inject(AuthService);
  private readonly i18n = inject(I18nService);
  protected readonly network = inject(NetworkService);

  protected readonly loading = signal(false);
  protected readonly loadFailed = signal(false);
  protected readonly plans = signal<Plan[]>([]);
  protected readonly payments = signal<PaymentRecord[]>([]);
  protected readonly selectedId = signal<number | null>(null);
  protected readonly phase = signal<Phase>('idle');
  protected readonly error = signal<ApiError | null>(null);
  protected readonly result = signal<Subscription | null>(null);
  protected readonly historyOpen = signal(false);
  /** The checkout just started on this screen (else the one the server says is still waiting). */
  private payingId: number | null = null;

  protected readonly summary = computed(() => this.subs.summary());
  /** From the SERVER's gateway (fake or sk_test_ keys), never from the app's build. */
  protected readonly testMode = computed(() => this.summary()?.test_mode === true);
  protected readonly isDriver = computed(() => this.auth.role() === 'driver');
  protected readonly homeUrl = computed(() => (this.isDriver() ? '/driver/home' : '/passenger/book'));
  protected readonly homeKey = computed<MessageKey>(() => (this.isDriver() ? 'sub.backHome' : 'sub.backBook'));
  protected readonly backUrl = computed(() => (this.isDriver() ? '/driver/home' : '/passenger/account'));
  /** The lead says why it's needed, or, once subscribed, what it allows. */
  protected readonly leadKey = computed<MessageKey>(() => {
    const on = this.active() || this.phase() === 'paid';
    if (this.isDriver()) return on ? 'sub.lead.driverOn' : 'sub.lead.driver';
    return on ? 'sub.lead.passengerOn' : 'sub.lead.passenger';
  });

  protected readonly active = computed(() => this.summary()?.status === 'active');
  protected readonly ended = computed(() => ['past_due', 'expired', 'suspended'].includes(this.summary()?.status ?? ''));
  protected readonly selected = computed(() => this.plans().find((p) => p.id === this.selectedId()) ?? null);
  protected readonly busy = computed(() => this.phase() === 'opening' || this.phase() === 'checking');
  /** A checkout still waiting, shown with "Check again" / "Cancel" (e.g. the app was closed while paying). */
  protected readonly waiting = computed(() => (this.phase() === 'idle' ? this.summary()?.pending ?? null : null));
  /**
   * The plans and "Pay" only when nothing is waiting: while a payment may still arrive, a second
   * orange Pay could make someone pay twice, and "Check again" must be THE next step.
   */
  protected readonly showPlans = computed(
    () =>
      ['idle', 'opening', 'cancelled'].includes(this.phase()) &&
      !this.waiting() &&
      !this.summary()?.renewal &&
      this.plans().length > 0,
  );

  protected readonly peso = peso;
  protected readonly date = phDate;

  constructor() {
    addIcons({ alertCircle, checkmarkCircle, chevronDown, chevronUp, ellipseOutline, informationCircleOutline, lockClosedOutline, timeOutline });
  }

  ionViewWillEnter(): void {
    this.phase.set('idle');
    this.error.set(null);
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(!this.summary());
    this.loadFailed.set(false);
    try {
      const [, plans] = await Promise.all([this.subs.loadCurrent(), this.subs.plans(), this.loadPayments()]);
      this.plans.set(plans);
      if (!plans.some((p) => p.id === this.selectedId())) this.selectedId.set(plans[0]?.id ?? null);
    } catch {
      this.loadFailed.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  private async loadPayments(): Promise<void> {
    this.payments.set(await this.subs.payments().catch(() => this.payments()));
  }

  protected select(plan: Plan): void {
    if (!this.busy()) this.selectedId.set(plan.id);
  }

  protected async pay(): Promise<void> {
    const plan = this.selected();
    if (!plan || this.busy()) return;
    this.phase.set('opening');
    this.error.set(null);
    try {
      const { subscription, checkout_url } = await this.subs.start(plan.id);
      this.payingId = subscription.id;
      const how = await this.subs.openCheckout(checkout_url);
      if (how === 'cancelled') {
        await this.cancelPayment();
      } else {
        await this.check();
      }
    } catch (e) {
      this.error.set(e as ApiError);
      this.phase.set('idle');
    }
  }

  /** "Check again": ask the server (it asks PayMongo if it hasn't heard yet). */
  protected async check(): Promise<void> {
    const id = this.payingId ?? this.summary()?.pending?.id;
    if (!id) return;
    this.phase.set('checking');
    this.error.set(null);
    try {
      const subscription = await this.subs.confirm(id);
      if (subscription.status === 'pending') {
        this.phase.set('notYet');
      } else if (subscription.status === 'cancelled') {
        this.phase.set('cancelled');
      } else {
        this.result.set(subscription);
        this.phase.set('paid');
        void this.auth.refreshSession(); // the gates (/auth/me) see it at once
      }
    } catch (e) {
      this.error.set(e as ApiError);
      this.phase.set('notYet');
    }
    void this.loadPayments();
  }

  protected async cancelPayment(): Promise<void> {
    const id = this.payingId ?? this.summary()?.pending?.id;
    if (!id) return;
    try {
      const subscription = await this.subs.cancel(id);
      // Paid after all? The server says so, and the payment wins.
      if (subscription.status === 'active' || subscription.status === 'scheduled') {
        this.result.set(subscription);
        this.phase.set('paid');
      } else {
        this.phase.set('cancelled');
      }
      this.payingId = null;
    } catch (e) {
      this.error.set(e as ApiError);
    }
    void this.loadPayments();
  }

  protected toggleHistory(): void {
    this.historyOpen.update((open) => !open);
  }

  // ---------- text helpers (all wording lives in the message files) ----------

  protected monthsLabel(plan: Plan): string {
    return plan.duration_months === 1 ? this.i18n.t('sub.month') : this.i18n.t('sub.months', { n: plan.duration_months });
  }

  /** Under the plan: "1 month free" for the longer plans, how it works for the monthly one. */
  protected planNote(plan: Plan): string {
    const free = monthsFree(plan, this.plans());
    if (free === 1) return this.i18n.t('sub.monthFree');
    if (free > 1) return this.i18n.t('sub.monthsFree', { n: free });
    return this.i18n.t('sub.monthly'); // not "₱199 a month" beside ₱199: it read like a second charge
  }

  protected daysLeft(n: number): string {
    return n === 1 ? this.i18n.t('sub.dayLeft') : this.i18n.t('sub.daysLeft', { n });
  }

  protected paidText(s: Subscription): string {
    const until = this.summary()?.active_until ?? s.ends_at ?? '';
    return this.i18n.t(s.status === 'scheduled' ? 'sub.paidRenewal' : 'sub.paid', { date: phDate(until) });
  }

  protected paymentLine(p: PaymentRecord): string {
    const parts = [peso(p.amount)];
    if (p.method) parts.push(this.methodName(p.method));
    parts.push(phDate(p.paid_at ?? p.created_at));
    return parts.join(' · ');
  }

  protected txKey(status: PaymentRecord['status']): MessageKey {
    return `sub.tx.${status}` as MessageKey;
  }

  private methodName(method: string): string {
    const key = `sub.method.${method}`;
    return ['gcash', 'paymaya', 'card', 'manual'].includes(method) ? this.i18n.t(key as MessageKey) : method;
  }
}
