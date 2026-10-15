import { Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';
import { IonContent, IonFooter, IonIcon, IonSpinner, Platform, ViewDidEnter, ViewWillLeave } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  alertCircle, cardOutline, checkmarkCircle, chevronDown, chevronUp, ellipseOutline, informationCircleOutline, locate,
  locationOutline, navigateOutline,
} from 'ionicons/icons';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../../core/i18n/t.pipe';
import { AppLifecycleService } from '../../../../core/services/app-lifecycle.service';
import { LocationService } from '../../../../core/services/location.service';
import { AppMap, LatLng, MapService } from '../../../../core/services/map.service';
import { NetworkService } from '../../../../core/services/network.service';
import { RideService } from '../../../../core/services/ride.service';
import { SubscriptionService } from '../../../../core/services/subscription.service';
import { OfflineNoticeComponent } from '../../../../shared/components/offline-notice/offline-notice.component';
import { LocationError } from '../../../../shared/models/location.model';
import { BookingOptions, Estimate, FareOption, RideType } from '../../../../shared/models/ride.model';
import { ApiError } from '../../../../shared/utilities/api-error';
import { endingSoon, peso, phDate } from '../../../../shared/utilities/subscription-view';
import { BookingDraftService } from '../../booking-draft.service';
import { insideArea, tooClose, townCenter } from '../../booking-checks';

/** Where the booking screen stands before the steps can run (booking brief § 5, "Gates"). */
type Gate = 'checking' | 'subscribe' | 'ready' | 'error';
/** The location situation: L1 (ask), L2 (denied), L3 (GPS off / timeout). */
type Locating = 'idle' | 'ask' | 'finding' | 'denied' | 'failed';

/**
 * Book (design-briefs/passenger-booking.md): one map-backed screen with a sheet that advances
 * through 3 steps: 1 pickup · 2 destination · 3 ride type + fare + Mag-book. The Android Back
 * button steps backward through them (Phase 10 decision #2). The draft lives in
 * BookingDraftService, so leaving the tab keeps it.
 */
@Component({
  selector: 'app-passenger-book',
  templateUrl: './passenger-book.page.html',
  styleUrls: ['./passenger-book.page.scss'],
  imports: [FormsModule, IonContent, IonFooter, IonIcon, IonSpinner, OfflineNoticeComponent, RouterLink, TranslatePipe],
})
export class PassengerBookPage implements ViewDidEnter, ViewWillLeave {
  private readonly rides = inject(RideService);
  private readonly subs = inject(SubscriptionService);
  private readonly maps = inject(MapService);
  private readonly location = inject(LocationService);
  private readonly i18n = inject(I18nService);
  private readonly router = inject(Router);
  private readonly platform = inject(Platform);
  private readonly lifecycle = inject(AppLifecycleService);
  protected readonly network = inject(NetworkService);
  protected readonly draft = inject(BookingDraftService);

  private readonly mapEl = viewChild.required<ElementRef<HTMLElement>>('map');
  private readonly waitChips = viewChild<ElementRef<HTMLElement>>('waitChips');
  private map: AppMap | null = null;
  private stopMoveListener: (() => void) | null = null;
  private backSub: { unsubscribe(): void } | null = null;
  private refreshing: Promise<void> | null = null;

  protected readonly gate = signal<Gate>('checking');
  protected readonly options = signal<BookingOptions | null>(null);
  protected readonly locating = signal<Locating>('idle');
  /** The point under the center pin, updated after each pan. */
  protected readonly center = signal<LatLng | null>(null);
  protected readonly landmark = signal('');
  protected readonly estimating = signal(false);
  protected readonly estimateFailed = signal(false);
  protected readonly booking = signal(false);
  protected readonly bookError = signal<string | null>(null);
  /** E5: the fare changed between the estimate and Mag-book. */
  protected readonly fareChange = signal<{ fare: string; old: string } | null>(null);
  protected readonly showDetails = signal(false);
  protected readonly showNote = signal(false);
  private readonly fromPrice = signal<string | null>(null);

  protected readonly peso = peso;
  protected readonly step = this.draft.step;
  protected readonly gateText = computed(() =>
    this.fromPrice() ? this.i18n.t('book.gate', { price: this.fromPrice()! }) : this.i18n.t('sub.lead.passenger'),
  );
  protected readonly endingText = computed(() => {
    const summary = this.subs.summary();
    return endingSoon(summary) && summary?.active_until ? this.i18n.t('sub.endingSoon', { date: phDate(summary.active_until) }) : null;
  });

  /** E1 / E2 for the pin being placed: shown inline, and the button stays disabled (brief § 5). */
  protected readonly pinError = computed<'e1' | 'e2' | null>(() => {
    const options = this.options();
    const point = this.center();
    if (!options || !point || this.step() === 3) return null;
    if (!insideArea(options, point)) return 'e1';
    const pickup = this.draft.pickup();
    if (this.step() === 2 && pickup && tooClose(options, pickup, point)) return 'e2';
    return null;
  });

  /** The option cards, in the brief's order (One-way, then Balikan), only for enabled types. */
  protected readonly cards = computed<FareOption[]>(() => {
    const order: RideType[] = ['one_way', 'two_way'];
    return [...(this.draft.estimate()?.options ?? [])].sort((a, b) => order.indexOf(a.ride_type) - order.indexOf(b.ride_type));
  });

  protected readonly waitChoices = computed(() => this.options()?.wait_choices ?? [15, 30, 60]);

  constructor() {
    addIcons({
      alertCircle, cardOutline, checkmarkCircle, chevronDown, chevronUp, ellipseOutline, informationCircleOutline, locate,
      locationOutline, navigateOutline,
    });

    // Back from the ride screen or Subscription (another stack) doesn't always fire this tab's
    // lifecycle: refresh on the router too (the Phase 7 tab lesson).
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe((e) => {
        if (e.urlAfterRedirects.startsWith('/passenger/book')) void this.refresh();
      });
    effect(() => {
      if (this.lifecycle.isActive()) void this.refresh();
    });
  }

  ionViewDidEnter(): void {
    void this.refresh();
    this.map?.resize(); // the tab was hidden: Leaflet must measure its box again
    // Android Back steps back through the booking steps before leaving the tab (decision #2).
    this.backSub = this.platform.backButton.subscribeWithPriority(10, (next) => {
      if (this.gate() === 'ready' && this.step() > 1) {
        this.goToStep((this.step() - 1) as 1 | 2);
      } else {
        next();
      }
    });
  }

  ionViewWillLeave(): void {
    this.backSub?.unsubscribe();
    this.backSub = null;
  }

  // ---------------------------------------------------------------- gates (brief § 5, in order)

  private refresh(): Promise<void> {
    this.refreshing ??= this.runGates().finally(() => (this.refreshing = null));
    return this.refreshing;
  }

  private async runGates(): Promise<void> {
    try {
      // 1. Already riding → the ride screen, no booking form.
      const active = await this.rides.active();
      if (active) {
        void this.router.navigate(['/passenger/ride', active.id], { replaceUrl: true });
        return;
      }
      // 2. Subscription.
      const summary = await this.subs.loadCurrent();
      if (summary.status !== 'active') {
        this.gate.set('subscribe');
        void this.loadFromPrice();
        return;
      }
      this.options.set(this.options() ?? (await this.rides.bookingOptions()));
      this.gate.set('ready');
      this.ensureMap();
      // A draft that arrives at step 3 without fares ("Mag-book ulit" from the ride screen).
      if (this.step() === 3 && !this.draft.estimate() && !this.estimating()) {
        void this.fetchEstimate();
      }
      // 3. Location, only when no pin is set yet (a kept draft wins).
      if (this.step() === 1 && !this.draft.pickup() && this.locating() === 'idle') {
        await this.startLocating();
      }
    } catch {
      if (this.gate() === 'checking') this.gate.set('error');
    }
  }

  private async loadFromPrice(): Promise<void> {
    if (this.fromPrice()) return;
    const monthly = (await this.subs.plans().catch(() => [])).find((p) => p.duration_months === 1);
    this.fromPrice.set(monthly ? peso(monthly.price) : null);
  }

  protected retryGates(): void {
    this.gate.set('checking');
    void this.refresh();
  }

  // ---------------------------------------------------------------- map + location

  /** The map opens on the kept draft, else the town center until the GPS answers. */
  private ensureMap(): void {
    if (this.map) return;
    const options = this.options()!;
    const start = this.draft.step() === 2 ? (this.draft.destination() ?? this.draft.pickup()) : this.draft.pickup();
    setTimeout(() => {
      // after Angular has rendered the map box
      this.map = this.maps.create(this.mapEl().nativeElement, start ?? townCenter(options), 16);
      this.center.set(this.map.center());
      this.stopMoveListener = this.map.onMoveEnd((c) => this.center.set(c));
      this.drawMarkers();
      if (this.step() === 3) this.fitBothAfterResize();
    });
  }

  /** L1: the reason first, then the system prompt (only when Android hasn't been asked yet). */
  private async startLocating(): Promise<void> {
    try {
      const permission = await this.location.checkPermission();
      if (permission === 'prompt') {
        this.locating.set('ask');
        return;
      }
      if (permission === 'denied') {
        this.locating.set('denied');
        return;
      }
      await this.locate();
    } catch {
      this.locating.set('failed'); // location services off
    }
  }

  /** "Sige, gamitin" (L1), "Gamitin ang lokasyon ko", and "Subukan ulit" (L3). */
  protected async locate(): Promise<void> {
    this.locating.set('finding');
    try {
      const here = await this.location.getCurrentPosition();
      this.locating.set('idle');
      this.map?.setView({ lat: here.lat, lng: here.lng }, 17);
    } catch (err) {
      this.locating.set(LocationError.from(err).kind === 'DENIED' ? 'denied' : 'failed');
    }
  }

  /**
   * Step 3 shrinks the map box (a 200 ms CSS transition). Fitting before it ends would use the
   * old height and cut a pin off, so measure again and fit once the box has its final size.
   */
  private fitBothAfterResize(): void {
    setTimeout(() => {
      const pickup = this.draft.pickup();
      const destination = this.draft.destination();
      if (!this.map || !pickup || !destination) return;
      this.map.resize();
      this.map.fit([pickup, destination]);
    }, 260);
  }

  private drawMarkers(): void {
    if (!this.map) return;
    const step = this.step();
    this.map.setMarker('pickup', step >= 2 ? this.draft.pickup() : null);
    this.map.setMarker('destination', step === 3 ? this.draft.destination() : null);
  }

  // ---------------------------------------------------------------- the steps

  /** Step 1 → 2: "Dito ako susunduin". */
  protected confirmPickup(): void {
    const point = this.center();
    if (!point || this.pinError()) return;
    this.draft.pickup.set({ ...point, landmark: this.landmark().trim() });
    this.landmark.set(this.draft.destination()?.landmark ?? '');
    this.goToStep(2);
    if (this.draft.destination()) this.map?.setView(this.draft.destination()!);
  }

  /** Step 2 → 3: "Dito ako pupunta" → both fares at once. */
  protected confirmDestination(): void {
    const point = this.center();
    if (!point || this.pinError()) return;
    this.draft.destination.set({ ...point, landmark: this.landmark().trim() });
    this.goToStep(3);
    this.fitBothAfterResize();
    void this.fetchEstimate();
  }

  /** Back (system or the summary rows): the pins stay, the field shows that step's landmark. */
  protected goToStep(step: 1 | 2 | 3): void {
    this.draft.step.set(step);
    this.fareChange.set(null);
    this.bookError.set(null);
    if (step === 1) {
      this.landmark.set(this.draft.pickup()?.landmark ?? '');
      if (this.draft.pickup()) this.map?.setView(this.draft.pickup()!, 17);
    } else if (step === 2) {
      this.landmark.set(this.draft.destination()?.landmark ?? '');
      const target = this.draft.destination() ?? this.draft.pickup();
      if (target) this.map?.setView(target, 17);
    }
    this.drawMarkers();
  }

  protected async fetchEstimate(): Promise<void> {
    const pickup = this.draft.pickup();
    const destination = this.draft.destination();
    if (!pickup || !destination) return;
    this.estimating.set(true);
    this.estimateFailed.set(false);
    try {
      const estimate = await this.rides.estimate(pickup, destination, this.draft.rideType() === 'two_way' ? this.draft.waitMinutes() : null);
      this.draft.estimate.set(estimate);
      if (this.draft.rideType() && !estimate.options.some((o) => o.ride_type === this.draft.rideType())) {
        this.draft.rideType.set(null); // the admin switched that type off meanwhile
      }
    } catch {
      this.estimateFailed.set(true); // E3: the pins are kept
    } finally {
      this.estimating.set(false);
    }
  }

  protected chooseType(type: RideType): void {
    this.draft.rideType.set(type);
    this.fareChange.set(null);
    if (type === 'two_way' && !this.draft.waitChosen()) {
      // The wait chips appear below the cards, often behind the pinned footer: bring them into view,
      // since the button stays disabled until one is chosen.
      setTimeout(() => this.waitChips()?.nativeElement.scrollIntoView({
        block: 'center',
        behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      }));
    }
  }

  /** A wait chip; the fare is asked again, in case a waiting fee applies (₱0 under today's rule). */
  protected chooseWait(minutes: number | null): void {
    this.draft.waitMinutes.set(minutes);
    this.draft.waitChosen.set(true);
    void this.fetchEstimate();
  }

  protected waitLabel(minutes: number): string {
    return minutes === 60 ? this.i18n.t('book.wait60') : this.i18n.t('book.waitMin', { n: minutes });
  }

  /** "Mag-book · ₱85". */
  protected async book(): Promise<void> {
    const chosen = this.draft.chosen();
    const pickup = this.draft.pickup();
    const destination = this.draft.destination();
    if (!chosen || !pickup || !destination || !this.draft.ready() || this.booking()) return;

    this.booking.set(true);
    this.bookError.set(null);
    this.fareChange.set(null);
    try {
      const ride = await this.rides.book({
        pickup_lat: pickup.lat,
        pickup_lng: pickup.lng,
        pickup_landmark: pickup.landmark || null,
        destination_lat: destination.lat,
        destination_lng: destination.lng,
        destination_landmark: destination.landmark || null,
        ride_type: chosen.ride_type,
        wait_minutes: chosen.ride_type === 'two_way' ? this.draft.waitMinutes() : null,
        passenger_note: this.draft.note().trim() || null,
        expected_total: chosen.total,
      });
      // replaceUrl: Back from the ride screen doesn't return to a finished booking form (brief § 4).
      void this.router.navigate(['/passenger/ride', ride.id], { replaceUrl: true });
    } catch (e) {
      this.handleBookError(e as ApiError, chosen);
    } finally {
      this.booking.set(false);
    }
  }

  private handleBookError(error: ApiError, chosen: FareOption): void {
    switch (error.code) {
      case 'FARE_CHANGED': {
        // E5: show the new total; the passenger taps Mag-book again to confirm THAT amount.
        const fresh = (error.data?.['estimate'] ?? null) as FareOption | null;
        const estimate = this.draft.estimate();
        if (fresh && estimate) {
          this.draft.estimate.set({ ...estimate, options: estimate.options.map((o) => (o.ride_type === fresh.ride_type ? fresh : o)) } as Estimate);
          this.fareChange.set({ fare: peso(fresh.total), old: peso(chosen.total) });
        }
        return;
      }
      case 'ACTIVE_RIDE_EXISTS': {
        const id = error.data?.['ride_id'];
        if (id) void this.router.navigate(['/passenger/ride', id], { replaceUrl: true });
        return;
      }
      case 'SUBSCRIPTION_INACTIVE':
        this.gate.set('subscribe'); // the pins are kept for after renewing (brief § 5)
        void this.loadFromPrice();
        return;
      default:
        this.bookError.set(error.status === 0 ? this.i18n.t('book.e4') : error.message);
    }
  }

}
