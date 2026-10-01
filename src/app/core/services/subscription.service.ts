import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor, PluginListenerHandle } from '@capacitor/core';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { I18nService } from '../i18n/i18n.service';
import { PaymentRecord, PaymentReturn, Plan, Subscription, SubscriptionSummary } from '../../shared/models/subscription.model';
import { apiCall } from './api-call';

/** The deep link the API's /payments/return page opens (AndroidManifest intent-filter). */
export const PAYMENT_RETURN_PREFIX = 'com.papayahatidgo.app://payment';

/** How long to keep asking after the payment page closes: the webhook or reconciliation may need a moment. */
export const CONFIRM_DELAYS_MS = [0, 1500, 3000, 5000];

/**
 * Subscriptions for passengers and drivers (API: Phase 8).
 *
 * The payment itself happens on PayMongo's page in a Custom Tab (@capacitor/browser), never in
 * the app's WebView, so the app never sees card or GCash details. Coming back only means
 * "go and ASK": confirm() polls the API, and only the server decides whether it was paid
 * (phase-0 § F.2 guarantee #1).
 * @throws ApiError on every API failure
 */
@Injectable({ providedIn: 'root' })
export class SubscriptionService {
  private readonly http = inject(HttpClient);
  private readonly i18n = inject(I18nService);
  private readonly base = environment.apiUrl;

  private readonly state = signal<SubscriptionSummary | null>(null);
  /** The last GET /subscriptions/current (Home, Book and Account read it). */
  readonly summary = this.state.asReadonly();
  readonly isActive = computed(() => this.state()?.status === 'active');

  private readonly t = (k: Parameters<I18nService['t']>[0]) => this.i18n.t(k);

  async loadCurrent(): Promise<SubscriptionSummary> {
    const summary = await apiCall(
      this.http.get<{ data: SubscriptionSummary }>(`${this.base}/subscriptions/current`).pipe(map((r) => r.data)),
      this.t,
    );
    this.state.set(summary);
    return summary;
  }

  plans(): Promise<Plan[]> {
    return apiCall(this.http.get<{ data: Plan[] }>(`${this.base}/subscription-plans`).pipe(map((r) => r.data)), this.t);
  }

  payments(): Promise<PaymentRecord[]> {
    return apiCall(this.http.get<{ data: PaymentRecord[] }>(`${this.base}/subscription-transactions`).pipe(map((r) => r.data)), this.t);
  }

  /** One period; the server asks the gateway first if it's still waiting (reconciliation). */
  get(id: number): Promise<Subscription> {
    return apiCall(this.http.get<{ data: Subscription }>(`${this.base}/subscriptions/${id}`).pipe(map((r) => r.data)), this.t);
  }

  /** POST /subscriptions → a pending subscription + the page to pay on. */
  start(planId: number): Promise<{ subscription: Subscription; checkout_url: string }> {
    return apiCall(
      this.http
        .post<{ data: { subscription: Subscription; checkout_url: string } }>(`${this.base}/subscriptions`, { plan_id: planId })
        .pipe(map((r) => r.data)),
      this.t,
    );
  }

  async cancel(id: number): Promise<Subscription> {
    const subscription = await apiCall(
      this.http.post<{ data: Subscription }>(`${this.base}/subscriptions/${id}/cancel`, {}).pipe(map((r) => r.data)),
      this.t,
    );
    await this.loadCurrent().catch(() => undefined);
    return subscription;
  }

  /**
   * Open the payment page and wait until the user is back: via the return page's deep link
   * (success / cancelled) or by closing the tab ('closed'). In a desktop browser (npm start)
   * there's no way back to detect, so it resolves at once and the page offers "Check again".
   */
  openCheckout(url: string): Promise<PaymentReturn> {
    if (Capacitor.getPlatform() === 'web') {
      window.open(url, '_blank');
      return Promise.resolve('closed');
    }

    return new Promise<PaymentReturn>((resolve) => {
      const handles: Promise<PluginListenerHandle>[] = [];
      let done = false;
      const finish = (result: PaymentReturn) => {
        if (done) return;
        done = true;
        handles.forEach((h) => void h.then((l) => l.remove()));
        resolve(result);
      };

      handles.push(
        App.addListener('appUrlOpen', (event) => {
          if (!event.url.startsWith(PAYMENT_RETURN_PREFIX)) return;
          void Browser.close().catch(() => undefined); // the tab may already be gone
          finish(event.url.includes('result=success') ? 'success' : 'cancelled');
        }),
        Browser.addListener('browserFinished', () => finish('closed')),
      );

      void Browser.open({ url, toolbarColor: '#ffffff' }).catch(() => finish('closed'));
    });
  }

  /**
   * After the page closes: ask the server a few times (CONFIRM_DELAYS_MS) until the period is no
   * longer pending. Returns the last answer; still 'pending' means "not received yet".
   */
  async confirm(id: number, delays = CONFIRM_DELAYS_MS): Promise<Subscription> {
    let latest: Subscription | null = null;
    for (const delay of delays) {
      if (delay) await new Promise((r) => setTimeout(r, delay));
      latest = await this.get(id);
      if (latest.status !== 'pending') break;
    }
    await this.loadCurrent().catch(() => undefined);
    return latest!;
  }

  /** Forget the cached status (logout). */
  clear(): void {
    this.state.set(null);
  }
}
