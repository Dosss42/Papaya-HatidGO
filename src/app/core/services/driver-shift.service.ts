import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { KeepAwake } from '@capacitor-community/keep-awake';
import { byNearest, offlineReason, OfflineReason } from '../../features/driver/driver-ride-view';
import { Eligibility, Offer } from '../../shared/models/driver-ride.model';
import { LocationError } from '../../shared/models/location.model';
import { ApiError } from '../../shared/utilities/api-error';
import { I18nService } from '../i18n/i18n.service';
import { MessageKey } from '../i18n/messages.en';
import { AppLifecycleService } from './app-lifecycle.service';
import { DriverLocationService } from './driver-location.service';
import { DriverRideService } from './driver-ride.service';
import { LocationService } from './location.service';
import { RequestAlertService } from './request-alert.service';
import { RideService } from './ride.service';

/** Check for requests this often while online (driver-home brief § 3.2). */
export const OFFERS_EVERY_MS = 5000;
/** "Nakuha na ng ibang driver." / "Wala na ang request na ito." stay this long (brief § 4). */
export const OUTCOME_MS = 3000;

export type ShiftState = 'offline' | 'going' | 'online';
export type OfferOutcome = 'taken' | 'gone';

/**
 * The driver's working state (Phase 11), shared by Home, the request takeover and the ride
 * screen: offline → going online → online (waiting) → on a ride → online again. It owns the
 * screen-on lock, the offers poll and the request alert; DriverLocationService owns the GPS.
 * The app is never "online" on its own: every online moment is one the server confirmed.
 */
@Injectable({ providedIn: 'root' })
export class DriverShiftService {
  private readonly api = inject(DriverRideService);
  private readonly gps = inject(LocationService);
  private readonly location = inject(DriverLocationService);
  private readonly alert = inject(RequestAlertService);
  private readonly lifecycle = inject(AppLifecycleService);
  private readonly i18n = inject(I18nService);
  private readonly router = inject(Router);
  private readonly rides = inject(RideService);

  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private outcomeTimer: ReturnType<typeof setTimeout> | null = null;
  private polling = false;
  private clockOffset = 0;
  /** Offers the driver tapped Tanggapin on. */
  private readonly tried = new Set<number>();
  private synced = false;
  /** Offers the driver already answered (or that ended on screen): never shown again. */
  private readonly handled = new Set<number>();

  readonly state = signal<ShiftState>('offline');
  /** Why going online failed (the server's checklist reason or the GPS), with the next step. */
  readonly goError = signal<{ message: string; link: OfflineReason['link'] } | null>(null);
  /** "Na-offline ka: {reason}." — the server switched the driver off (brief § 5). */
  readonly forced = signal<OfflineReason | null>(null);
  /** The location permission isn't decided yet: Home explains why before the system asks. */
  readonly askingLocation = signal(false);

  /** Open requests, nearest pickup first (brief § 4). */
  readonly offers = signal<Offer[]>([]);
  /** The ONE request on screen (the full-screen takeover), and how it ended, if it did. */
  readonly shown = signal<Offer | null>(null);
  readonly outcome = signal<OfferOutcome | null>(null);
  readonly accepting = signal(false);
  readonly acceptError = signal<string | null>(null);
  /** "+1 pang request". */
  readonly queued = computed(() => this.offers().filter((o) => o.offer_id !== this.shown()?.offer_id).length);

  /** The ride in progress (the poll pauses; the GPS sends the trail instead). */
  readonly rideId = signal<number | null>(null);

  readonly gpsLost = this.location.gpsLost;
  readonly position = this.location.sentPosition;

  constructor() {
    // The server refused an idle ping (409 NOT_ONLINE): it has already stopped matching us.
    effect(() => {
      if (this.location.serverOffline() && this.state() === 'online') void this.forceOffline();
    });
    // The trail was refused because the ride is over (e.g. the passenger cancelled while the
    // driver was on another tab, where no ride screen polls): back to waiting.
    effect(() => {
      if (this.location.rideOver() && untracked(() => this.rideId()) !== null) untracked(() => this.rideEnded());
    });
    // Back from the background: check at once (timers were paused by Android).
    let wasActive = true;
    effect(() => {
      const active = this.lifecycle.isActive();
      if (active && !wasActive) untracked(() => void this.poll());
      wasActive = active;
    });
  }

  // ------------------------------------------------------------------ online / offline

  /** Mag-online (brief § 3.2): permission → a GPS fix → the server's check → online. */
  async goOnline(): Promise<void> {
    if (this.state() !== 'offline') return;
    this.alert.unlock(); // inside the tap: lets the request tone play later
    this.state.set('going');
    this.goError.set(null);
    this.forced.set(null);

    let fix;
    try {
      this.askingLocation.set((await this.gps.checkPermission()) === 'prompt');
      fix = await this.gps.getCurrentPosition(); // asks for the permission if needed; 10 s timeout
    } catch (e) {
      const kind = e instanceof LocationError ? e.kind : 'UNAVAILABLE';
      this.fail(this.i18n.t(`location.${kind}` as MessageKey), null);
      return;
    } finally {
      this.askingLocation.set(false);
    }
    if (this.state() !== 'going') return; // logged out (reset) while waiting for the GPS

    try {
      await this.api.availability(true, { lat: fix.lat, lng: fix.lng });
      if (this.state() !== 'going') return; // logged out while the server answered
    } catch (e) {
      const error = e as ApiError;
      if (error.code === 'NOT_ELIGIBLE') {
        const reason = offlineReason(error.data as unknown as Eligibility);
        this.fail(this.i18n.t(reason.key), reason.link);
      } else {
        this.fail(error.message, null);
      }
      return;
    }

    this.state.set('online');
    this.handled.clear();
    void KeepAwake.keepAwake().catch(() => undefined);
    await this.location.startIdle(fix);
    this.startPolling();
  }

  /** Mag-offline: no confirmation (instantly reversible, brief § 2). */
  async goOffline(): Promise<void> {
    if (this.state() === 'offline') return;
    this.stopLocal();
    // If this fails (no internet), the server's 3-minute stale rule switches us off anyway.
    await this.api.availability(false).catch(() => undefined);
  }

  /**
   * Once per app start (Home's first load): the app always opens offline, but the server may
   * still have this driver online from before the app was closed or killed (e.g. by Android while
   * Google Maps was open). Say so at once, instead of being matched for up to 3 more minutes
   * with requests nobody sees (brief § 5: never look offline while the server is matching).
   */
  syncOffline(): void {
    if (this.synced || this.state() !== 'offline') return;
    this.synced = true;
    void this.api.availability(false).catch(() => (this.synced = false));
  }

  /** "Subukan ulit" on the GPS-lost banner. */
  retryGps(): Promise<void> {
    return this.location.retryNow();
  }

  /** Logout: forget everything (the next driver on this phone starts offline). */
  reset(): void {
    this.stopLocal();
    this.rideId.set(null);
    void this.location.stop();
    this.forced.set(null);
    this.goError.set(null);
    this.handled.clear();
    this.tried.clear();
    this.synced = false;
    void KeepAwake.allowSleep().catch(() => undefined); // even if a ride was open
  }

  private fail(message: string, link: OfflineReason['link']): void {
    if (this.state() !== 'going') return;
    this.goError.set({ message, link });
    this.state.set('offline');
  }

  /** The server has us offline: say why (the checklist's first failed check, or a stale location). */
  private async forceOffline(): Promise<void> {
    this.stopLocal();
    const eligibility = await this.api.eligibility().catch(() => null);
    this.forced.set(offlineReason(eligibility));
  }

  private stopLocal(): void {
    this.state.set('offline');
    this.stopPolling();
    this.clearShown();
    this.offers.set([]);
    if (this.rideId() === null) {
      void this.location.stop();
      void KeepAwake.allowSleep().catch(() => undefined);
    }
  }

  // ------------------------------------------------------------------ offers

  private startPolling(): void {
    this.stopPolling();
    void this.poll();
    this.pollTimer = setInterval(() => void this.poll(), OFFERS_EVERY_MS);
  }

  private stopPolling(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = null;
  }

  /** One read of GET /drivers/me/offers. A failure keeps what's on screen (the banner says why). */
  async poll(): Promise<void> {
    if (this.polling || this.state() !== 'online' || this.rideId() !== null) return;
    this.polling = true;
    try {
      const { offers, isOnline, clockOffsetMs } = await this.api.offers();
      this.clockOffset = clockOffsetMs;
      if (this.state() !== 'online' || this.rideId() !== null) return; // changed while waiting
      if (!isOnline) {
        await this.forceOffline();
        return;
      }
      const now = this.now();
      this.offers.set(byNearest(offers.filter((o) => !this.handled.has(o.offer_id) && Date.parse(o.expires_at) > now)));

      const current = this.shown();
      if (current && !this.outcome()) {
        // Gone from the list while on screen: another driver took it, or it was cancelled / expired.
        // If the driver had tapped Tanggapin and the answer was lost, it may be theirs: check first.
        if (!offers.some((o) => o.offer_id === current.offer_id) && !(await this.claimIfMine(current))) this.end('gone');
      } else if (!current) {
        this.showNext();
      }
    } catch {
      // No internet or a slow server: try again in 5 s.
    } finally {
      this.polling = false;
    }
  }

  /** The countdown reached 0 on screen (the takeover's own clock). */
  expired(): void {
    if (this.shown() && !this.outcome() && !this.accepting()) this.end('gone');
  }

  /** Laktawan: closes at once; recorded as declined so the next nearest driver gets it. */
  skip(): void {
    const offer = this.shown();
    if (!offer || this.accepting()) return;
    this.handled.add(offer.offer_id);
    this.clearShown();
    this.showNext();
    void this.api.decline(offer.ride_id).catch(() => undefined);
  }

  /** Tanggapin → Tinatanggap… → the ride screen, or the honest reason it's gone. */
  async accept(): Promise<void> {
    const offer = this.shown();
    if (!offer || this.accepting() || this.outcome()) return;
    this.accepting.set(true);
    this.acceptError.set(null);
    this.tried.add(offer.offer_id);
    this.alert.stop();
    try {
      const ride = await this.api.accept(offer.ride_id);
      this.handled.add(offer.offer_id);
      this.clearShown();
      this.startRide(ride.id);
      void this.router.navigate(['/driver/ride', ride.id]);
    } catch (e) {
      const error = e as ApiError;
      if (error.code === 'RIDE_TAKEN') this.end('taken');
      else if (error.code === 'OFFER_GONE' || error.status === 404) this.end('gone');
      else if (error.code === 'CANNOT_ACCEPT') {
        this.clearShown();
        await this.forceOffline();
      } else if (!(await this.claimIfMine(offer))) {
        // e.g. no internet or a lost answer, and the ride isn't ours: the request stays, try again.
        this.acceptError.set(error.message);
      }
    } finally {
      this.accepting.set(false);
    }
  }

  /**
   * After an accept whose answer never arrived (timeout, dropped connection): the server may have
   * given the ride to this driver. If GET /rides/active says so, open it instead of saying "gone".
   */
  private async claimIfMine(offer: Offer): Promise<boolean> {
    if (!this.tried.has(offer.offer_id)) return false;
    const ride = await this.rides.active().catch(() => null);
    if (ride?.id !== offer.ride_id) return false;
    this.handled.add(offer.offer_id);
    this.clearShown();
    this.startRide(ride.id);
    void this.router.navigate(['/driver/ride', ride.id]);
    return true;
  }

  /** Now on the SERVER's clock (request expiry is the server's, brief § 4 "real countdown"). */
  now(): number {
    return Date.now() + this.clockOffset;
  }

  private showNext(): void {
    const now = this.now();
    const next = this.offers().find((o) => !this.handled.has(o.offer_id) && Date.parse(o.expires_at) > now) ?? null;
    this.shown.set(next);
    this.outcome.set(null);
    this.acceptError.set(null);
    if (next) this.alert.start();
    else this.alert.stop();
  }

  /** Show "taken" / "gone" for 3 s, then the next request (if any) or back to waiting. */
  private end(outcome: OfferOutcome): void {
    const offer = this.shown();
    if (!offer) return;
    this.handled.add(offer.offer_id);
    this.offers.update((list) => list.filter((o) => o.offer_id !== offer.offer_id));
    this.outcome.set(outcome);
    this.alert.stop();
    if (this.outcomeTimer) clearTimeout(this.outcomeTimer);
    this.outcomeTimer = setTimeout(() => {
      this.outcomeTimer = null;
      if (this.shown()?.offer_id === offer.offer_id) this.showNext();
    }, OUTCOME_MS);
  }

  private clearShown(): void {
    if (this.outcomeTimer) clearTimeout(this.outcomeTimer);
    this.outcomeTimer = null;
    this.alert.stop();
    this.shown.set(null);
    this.outcome.set(null);
    this.acceptError.set(null);
  }

  // ------------------------------------------------------------------ the ride

  /** Accepted (or resumed after reopening the app): the trail every 10 s, the screen stays on. */
  startRide(rideId: number): void {
    if (this.rideId() === rideId) return;
    this.rideId.set(rideId);
    this.stopPolling();
    this.offers.set([]);
    void KeepAwake.keepAwake().catch(() => undefined);
    void this.location.startRide(rideId);
  }

  /** Completed or cancelled: back to waiting if still online, otherwise everything stops. */
  rideEnded(): void {
    if (this.rideId() === null) return;
    this.rideId.set(null);
    if (this.state() === 'online') {
      void this.location.startIdle();
      this.startPolling();
    } else {
      void this.location.stop();
      void KeepAwake.allowSleep().catch(() => undefined);
    }
  }
}
