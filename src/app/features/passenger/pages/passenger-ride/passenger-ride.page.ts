import { Component, ElementRef, OnDestroy, computed, effect, inject, input, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Haptics } from '@capacitor/haptics';
import {
  IonBackButton, IonContent, IonFooter, IonIcon, IonModal, IonSpinner, ViewDidEnter, ViewWillLeave,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { alertCircle, call, checkmarkCircle, cloudOfflineOutline, star, starOutline, timeOutline } from 'ionicons/icons';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { MessageKey } from '../../../../core/i18n/messages.en';
import { TranslatePipe } from '../../../../core/i18n/t.pipe';
import { AppLifecycleService } from '../../../../core/services/app-lifecycle.service';
import { AppMap, LatLng, MapService } from '../../../../core/services/map.service';
import { NetworkService } from '../../../../core/services/network.service';
import { RideService } from '../../../../core/services/ride.service';
import { CancelReason, Ride } from '../../../../shared/models/ride.model';
import { ApiError } from '../../../../shared/utilities/api-error';
import { peso } from '../../../../shared/utilities/subscription-view';
import { BookingDraftService } from '../../booking-draft.service';
import {
  canCancel, fareChanged, initials, isOver, minutesSince, returningCooling, showDriverCard, stages, statusLine,
} from '../../ride-view';

/** Every 4 s while the screen is visible (brief § 6: "3–5 seconds"). */
const POLL_MS = 4000;

/**
 * The passenger's active ride (design-briefs/active-ride.md), /passenger/ride/:id. ONE screen
 * whose content follows the server's status; the screen never advances a status by itself.
 * Also the "ride details" page opened from Rides (completed / cancelled rides, rate later).
 */
@Component({
  selector: 'app-passenger-ride',
  templateUrl: './passenger-ride.page.html',
  styleUrls: ['./passenger-ride.page.scss'],
  imports: [
    FormsModule, IonBackButton, IonContent, IonFooter, IonIcon, IonModal, IonSpinner, TranslatePipe,
  ],
})
export class PassengerRidePage implements ViewDidEnter, ViewWillLeave, OnDestroy {
  /** From the route /passenger/ride/:id (router input binding). */
  readonly id = input.required<string>();

  private readonly rides = inject(RideService);
  private readonly maps = inject(MapService);
  private readonly i18n = inject(I18nService);
  private readonly router = inject(Router);
  private readonly lifecycle = inject(AppLifecycleService);
  private readonly draft = inject(BookingDraftService);
  protected readonly network = inject(NetworkService);

  private readonly mapEl = viewChild<ElementRef<HTMLElement>>('map');
  private map: AppMap | null = null;
  /** Which framing the map last used: before the trip (pickup + driver) or the trip (whole route). */
  private framing: string | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private visible = false;
  private inFlight = false;

  protected readonly ride = signal<Ride | null>(null);
  protected readonly loadFailed = signal(false);
  /** The time of the last successful poll, for "Huling update: 1 min na". */
  protected readonly lastOkAt = signal<number | null>(null);
  protected readonly pollFailed = signal(false);
  /** Re-read on every tick, so timers ("12 min na") move without extra requests. */
  protected readonly now = signal(Date.now());

  protected readonly cancelOpen = signal(false);
  protected readonly cancelReason = signal<CancelReason | null>(null);
  protected readonly cancelling = signal(false);
  protected readonly actionError = signal<string | null>(null);
  protected readonly returningBusy = signal(false);
  protected readonly retrying = signal(false);

  protected readonly score = signal(0);
  protected readonly comment = signal('');
  protected readonly rating = signal(false);
  protected readonly rateLater = signal(false);
  protected readonly justRated = signal(false);

  protected readonly reasons: CancelReason[] = ['driver_late', 'changed_plans', 'wrong_pickup', 'other'];
  protected readonly starValues = [1, 2, 3, 4, 5];
  protected readonly peso = peso;
  protected readonly initials = initials;

  protected readonly line = computed(() => {
    const ride = this.ride();
    return ride ? statusLine(ride) : null;
  });
  protected readonly stageList = computed(() => (this.ride() ? stages(this.ride()!) : []));
  protected readonly cancellable = computed(() => !!this.ride() && canCancel(this.ride()!));
  protected readonly driverCard = computed(() => !!this.ride() && showDriverCard(this.ride()!));
  protected readonly over = computed(() => !!this.ride() && isOver(this.ride()!));
  protected readonly changed = computed(() => !!this.ride() && fareChanged(this.ride()!));
  protected readonly cooling = computed(() => !!this.ride() && returningCooling(this.ride()!, this.now()));
  protected readonly weak = computed(() => this.pollFailed() && !!this.ride() && !this.over());

  protected readonly arrivedMinutes = computed(() => minutesSince(this.ride()?.times.arrived_at ?? null, this.now()));
  protected readonly waitedMinutes = computed(() => minutesSince(this.ride()?.times.destination_reached_at ?? null, this.now()));

  /** "Huling update: 40 seg na" / "2 min na". */
  protected readonly lastUpdate = computed(() => {
    const at = this.lastOkAt();
    if (!at) return '';
    const seconds = Math.max(0, Math.round((this.now() - at) / 1000));
    return seconds < 60 ? this.i18n.t('ride.agoSec', { n: seconds }) : this.i18n.t('ride.agoMin', { n: Math.floor(seconds / 60) });
  });

  constructor() {
    addIcons({ alertCircle, call, checkmarkCircle, cloudOfflineOutline, star, starOutline, timeOutline });

    // Paused in the background, refreshed at once when the app comes back (brief § 6).
    effect(() => {
      const active = this.lifecycle.isActive();
      if (!this.visible) return;
      if (active) {
        void this.poll();
        this.startTimer();
      } else {
        this.stopTimer();
      }
    });
  }

  ionViewDidEnter(): void {
    this.visible = true;
    void this.poll();
    this.startTimer();
    this.map?.resize();
  }

  ionViewWillLeave(): void {
    this.visible = false;
    this.stopTimer();
  }

  ngOnDestroy(): void {
    this.stopTimer();
    this.map?.destroy();
  }

  private startTimer(): void {
    this.stopTimer();
    this.timer = setInterval(() => void this.poll(), POLL_MS);
  }

  private stopTimer(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /** One read of GET /rides/{id}. A failure keeps the last status on screen (never blanks out). */
  private async poll(): Promise<void> {
    this.now.set(Date.now());
    if (this.inFlight) return;
    this.inFlight = true;
    try {
      const fresh = await this.rides.get(Number(this.id()));
      this.onRide(fresh);
      this.lastOkAt.set(Date.now());
      this.pollFailed.set(false);
      this.loadFailed.set(false);
    } catch {
      this.pollFailed.set(true);
      if (!this.ride()) this.loadFailed.set(true);
    } finally {
      this.inFlight = false;
    }
  }

  private onRide(fresh: Ride): void {
    const before = this.ride();
    // The one moment the passenger must look up: a short vibration when the driver arrives.
    if (before && before.status !== 'arrived' && fresh.status === 'arrived') {
      void Haptics.vibrate({ duration: 400 }).catch(() => undefined);
    }
    this.ride.set(fresh);
    if (isOver(fresh)) {
      this.stopTimer(); // nothing more will change
      if (fresh.status === 'completed') this.draft.reset(); // the next booking starts fresh
    }
    setTimeout(() => this.drawMap(fresh)); // after Angular has rendered the map box
  }

  // ---------------------------------------------------------------- map

  private drawMap(ride: Ride): void {
    const el = this.mapEl()?.nativeElement;
    if (!el) return;
    const pickup: LatLng = { lat: +ride.pickup.lat, lng: +ride.pickup.lng };
    const destination: LatLng = { lat: +ride.destination.lat, lng: +ride.destination.lng };
    const driver = ride.driver?.location ? { lat: +ride.driver.location.lat, lng: +ride.driver.location.lng } : null;

    this.map ??= this.maps.create(el, pickup, 16);
    this.map.setMarker('pickup', pickup);
    this.map.setMarker('destination', destination);
    this.map.setMarker('driver', driver);

    // Before the trip, where the driver is matters (pickup + driver); from the start, the whole
    // route. Re-framed only when that changes, so the passenger's own panning isn't undone each poll.
    const phase = ['requested', 'accepted', 'driver_arriving', 'arrived'].includes(ride.status) ? 'pickup' : 'route';
    const framing = phase === 'pickup' && driver ? 'pickup+driver' : phase; // a driver appearing re-frames too
    if (framing !== this.framing) {
      this.framing = framing;
      setTimeout(() => {
        this.map?.resize(); // the map box changes height between the two framings
        this.map?.fit(phase === 'pickup' ? [pickup, ...(driver ? [driver] : [])] : [pickup, destination]);
      }, 260);
    }
  }

  // ---------------------------------------------------------------- texts

  protected lineText(): string {
    const line = this.line();
    return line ? this.i18n.t(line.key, line.params) : '';
  }

  protected chosenWait(ride: Ride): string {
    if (ride.wait_minutes === null) return this.i18n.t('ride.waitUnsure');
    return ride.wait_minutes === 60 ? this.i18n.t('book.wait60') : this.i18n.t('book.waitMin', { n: ride.wait_minutes });
  }

  protected reasonKey(reason: CancelReason): MessageKey {
    return `ride.reason.${reason}` as MessageKey;
  }

  // ---------------------------------------------------------------- actions

  protected openCancel(): void {
    this.cancelReason.set(null);
    this.actionError.set(null);
    this.cancelOpen.set(true);
  }

  protected async confirmCancel(): Promise<void> {
    const ride = this.ride();
    if (!ride || this.cancelling()) return;
    this.cancelling.set(true);
    try {
      this.onRide(await this.rides.cancel(ride.id, this.cancelReason()));
      this.cancelOpen.set(false);
    } catch (e) {
      // e.g. the trip started a second ago: the screen refreshes and explains itself.
      this.actionError.set((e as ApiError).message);
      this.cancelOpen.set(false);
      void this.poll();
    } finally {
      this.cancelling.set(false);
    }
  }

  /** "Pabalik na ako" (Balikan, waiting leg). */
  protected async returning(): Promise<void> {
    const ride = this.ride();
    if (!ride || this.returningBusy() || this.cooling()) return;
    this.returningBusy.set(true);
    this.actionError.set(null);
    try {
      this.onRide(await this.rides.passengerReturning(ride.id));
    } catch (e) {
      this.actionError.set((e as ApiError).message);
    } finally {
      this.returningBusy.set(false);
    }
  }

  protected async submitRating(): Promise<void> {
    const ride = this.ride();
    if (!ride || this.score() === 0 || this.rating()) return;
    this.rating.set(true);
    this.actionError.set(null);
    try {
      await this.rides.rate(ride.id, this.score(), this.comment().trim() || null);
      this.justRated.set(true);
      void this.poll();
    } catch (e) {
      const error = e as ApiError;
      this.actionError.set(error.status === 0 ? this.i18n.t('ride.rateOffline') : error.message);
    } finally {
      this.rating.set(false);
    }
  }

  /**
   * "Subukan ulit" (no driver): book the same trip again at today's fare. If anything stands in
   * the way (the fare changed, a gate), the Book screen opens at step 3 to show it.
   */
  protected async retry(): Promise<void> {
    const ride = this.ride();
    if (!ride || this.retrying()) return;
    this.retrying.set(true);
    this.draft.fromRide(ride);
    try {
      const estimate = await this.rides.estimate(this.draft.pickup()!, this.draft.destination()!, ride.wait_minutes);
      const option = estimate.options.find((o) => o.ride_type === ride.ride_type);
      if (!option) throw new Error('type off');
      const fresh = await this.rides.book({
        pickup_lat: +ride.pickup.lat,
        pickup_lng: +ride.pickup.lng,
        pickup_landmark: ride.pickup.landmark,
        destination_lat: +ride.destination.lat,
        destination_lng: +ride.destination.lng,
        destination_landmark: ride.destination.landmark,
        ride_type: ride.ride_type,
        wait_minutes: ride.wait_minutes,
        passenger_note: ride.passenger_note,
        expected_total: option.total,
      });
      void this.router.navigate(['/passenger/ride', fresh.id], { replaceUrl: true });
    } catch {
      this.changeBooking();
    } finally {
      this.retrying.set(false);
    }
  }

  /** "Mag-book ulit" / "Baguhin ang booking": the Book screen at step 3 with the same trip. */
  protected changeBooking(): void {
    const ride = this.ride();
    if (ride) this.draft.fromRide(ride);
    void this.router.navigate(['/passenger/book'], { replaceUrl: true });
  }
}
