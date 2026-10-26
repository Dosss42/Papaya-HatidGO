import { Component, ElementRef, OnDestroy, computed, effect, inject, input, signal, untracked, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Haptics } from '@capacitor/haptics';
import {
  IonBackButton, IonContent, IonFooter, IonIcon, IonModal, IonSpinner, ViewDidEnter, ViewWillLeave,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  alertCircle, call, chatbubbleEllipsesOutline, checkmarkCircle, cloudOfflineOutline, flagOutline, navigateCircleOutline,
  navigateOutline, timeOutline,
} from 'ionicons/icons';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { MessageKey } from '../../../../core/i18n/messages.en';
import { TranslatePipe } from '../../../../core/i18n/t.pipe';
import { AppLifecycleService } from '../../../../core/services/app-lifecycle.service';
import { DriverRideService } from '../../../../core/services/driver-ride.service';
import { DriverShiftService } from '../../../../core/services/driver-shift.service';
import { ageText, isStale, rideLines, roadPoints } from '../../../../core/services/map-geometry';
import { AppMap, LatLng, MapService, rideMapInset } from '../../../../core/services/map.service';
import { RideService } from '../../../../core/services/ride.service';
import { DriverCancelReason } from '../../../../shared/models/driver-ride.model';
import { Ride } from '../../../../shared/models/ride.model';
import { ApiError } from '../../../../shared/utilities/api-error';
import { peso } from '../../../../shared/utilities/subscription-view';
import { fareChanged, isOver, minutesSince, returningCooling, stages } from '../../../passenger/ride-view';
import {
  DRIVER_CANCEL_REASONS, canEndAtDestination, directionsUrl, driverCanCancel, driverLine, driverReasonKey, headingTo, nextStep,
} from '../../driver-ride-view';

/** Every 4 s while visible, like the passenger's screen (the passenger may cancel or tap "Pabalik na ako"). */
const POLL_MS = 4000;
/** After a step, the next one is ignored this long (protects against a double tap). */
const STEP_GUARD_MS = 1200;

/**
 * The driver's active ride, /driver/ride/:id (Phase 11 decision #1): the passenger's ride screen
 * mirrored. The status line first, then the passenger card, then where to go now, and ONE primary
 * button = the next step. Every step is the server's: the screen shows what the API returned.
 * Also the "ride details" page opened from the driver's Rides tab.
 */
@Component({
  selector: 'app-driver-ride',
  templateUrl: './driver-ride.page.html',
  styleUrls: ['../../../passenger/pages/passenger-ride/passenger-ride.page.scss', './driver-ride.page.scss'],
  imports: [IonBackButton, IonContent, IonFooter, IonIcon, IonModal, IonSpinner, TranslatePipe],
})
export class DriverRidePage implements ViewDidEnter, ViewWillLeave, OnDestroy {
  /** From the route /driver/ride/:id (router input binding). */
  readonly id = input.required<string>();

  private readonly rides = inject(RideService);
  private readonly driverRides = inject(DriverRideService);
  private readonly shift = inject(DriverShiftService);
  private readonly maps = inject(MapService);
  private readonly i18n = inject(I18nService);
  private readonly router = inject(Router);
  private readonly lifecycle = inject(AppLifecycleService);

  private readonly mapEl = viewChild<ElementRef<HTMLElement>>('map');
  private map: AppMap | null = null;
  private framing: string | null = null;
  /** The path actually driven (a finished ride), loaded once. */
  private driven: LatLng[] | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private visible = false;
  private inFlight = false;
  private guardUntil = 0;

  protected readonly ride = signal<Ride | null>(null);
  protected readonly loadFailed = signal(false);
  protected readonly lastOkAt = signal<number | null>(null);
  protected readonly pollFailed = signal(false);
  protected readonly now = signal(Date.now());

  protected readonly stepping = signal(false);
  protected readonly actionError = signal<string | null>(null);
  protected readonly cancelOpen = signal(false);
  protected readonly cancelReason = signal<DriverCancelReason | null>(null);
  protected readonly cancelling = signal(false);
  protected readonly endOpen = signal(false);
  protected readonly ending = signal(false);

  protected readonly reasons = DRIVER_CANCEL_REASONS;
  protected readonly peso = peso;

  protected readonly over = computed(() => !!this.ride() && isOver(this.ride()!));
  protected readonly next = computed(() => (this.ride() ? nextStep(this.ride()!) : null));
  protected readonly cancellable = computed(() => !!this.ride() && driverCanCancel(this.ride()!));
  protected readonly canEnd = computed(() => !!this.ride() && canEndAtDestination(this.ride()!));
  protected readonly heading = computed(() => (this.ride() ? headingTo(this.ride()!) : null));
  protected readonly changed = computed(() => !!this.ride() && fareChanged(this.ride()!));
  /** The track without "Searching" (the driver joined after it). */
  protected readonly stageList = computed(() => (this.ride() ? stages(this.ride()!).slice(1) : []));
  /** The passenger tapped "Pabalik na ako" in the last 5 minutes (Balikan, waiting). */
  protected readonly returning = computed(
    () => !!this.ride() && this.ride()!.current_leg === 'waiting' && returningCooling(this.ride()!, this.now()),
  );
  protected readonly waitedMinutes = computed(() => minutesSince(this.ride()?.times.destination_reached_at ?? null, this.now()));
  protected readonly weak = computed(() => this.pollFailed() && !!this.ride() && !this.over());

  /** How old the last SENT position is (the same one the passenger sees), in ms. */
  private readonly sendAgeMs = computed(() => {
    const at = this.shift.sentAt();
    return at === null ? null : Math.max(0, this.now() - at);
  });
  /** Stale when the GPS is lost OR the last send is older than 45 s (no data, server errors): finish review #2. */
  protected readonly positionStale = computed(() => !this.over() && (this.shift.gpsLost() || isStale(this.sendAgeMs())));
  protected readonly gpsLost = this.shift.gpsLost;
  protected readonly sendAge = computed(() => {
    const ms = this.sendAgeMs();
    if (ms === null) return '';
    const age = ageText(ms);
    return this.i18n.t(age.key, { n: age.n });
  });

  protected readonly lastUpdate = computed(() => {
    const at = this.lastOkAt();
    if (!at) return '';
    const seconds = Math.max(0, Math.round((this.now() - at) / 1000));
    return seconds < 60 ? this.i18n.t('ride.agoSec', { n: seconds }) : this.i18n.t('ride.agoMin', { n: Math.floor(seconds / 60) });
  });

  constructor() {
    addIcons({
      alertCircle, call, chatbubbleEllipsesOutline, checkmarkCircle, cloudOfflineOutline, flagOutline, navigateCircleOutline,
      navigateOutline, timeOutline,
    });

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

    // The driver's own marker = the last position SENT (the same one the passenger sees): each
    // send moves it (gliding) and its approach line; a lost GPS greys it out.
    effect(() => {
      this.shift.position();
      this.shift.gpsLost();
      // Only those two: drawMap reads the ride too, and the poll already redraws on each new ride.
      untracked(() => {
        const ride = this.ride();
        if (this.map && ride) this.drawMap(ride);
      });
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

  private async poll(): Promise<void> {
    this.now.set(Date.now());
    if (this.inFlight) return;
    this.inFlight = true;
    try {
      this.onRide(await this.rides.get(Number(this.id())));
      this.lastOkAt.set(Date.now());
      this.pollFailed.set(false);
      this.loadFailed.set(false);
    } catch {
      this.pollFailed.set(true);
      if (!this.ride()) this.loadFailed.set(true);
      // Still redraw: the last send keeps ageing and may now be stale (finish review #1).
      const ride = this.ride();
      if (ride) this.drawMap(ride);
    } finally {
      this.inFlight = false;
    }
  }

  private onRide(fresh: Ride): void {
    const before = this.ride();
    // "Pabalik na ang pasahero": the one moment the waiting driver must look up.
    if (before && fresh.passenger_returning_at && fresh.passenger_returning_at !== before.passenger_returning_at) {
      void Haptics.vibrate({ duration: 500 }).catch(() => undefined);
    }
    // The passenger cancelled while the driver was on the way.
    if (before && !isOver(before) && fresh.status === 'cancelled') {
      void Haptics.vibrate({ duration: 500 }).catch(() => undefined);
    }
    this.ride.set(fresh);
    if (isOver(fresh)) {
      this.stopTimer();
      if (this.shift.rideId() === fresh.id) this.shift.rideEnded(); // back to waiting (if online)
      void this.loadDriven(fresh);
    } else {
      this.shift.startRide(fresh.id); // resumed after reopening the app: the trail runs again
    }
    setTimeout(() => this.drawMap(fresh));
  }

  /** A finished ride: the path actually driven, once (Phase 12 decision #5). */
  private async loadDriven(ride: Ride): Promise<void> {
    if (this.driven) return;
    try {
      const trail = await this.rides.trail(ride.id);
      this.driven = trail.points.map((p) => ({ lat: p.lat, lng: p.lng }));
      this.drawMap(ride);
    } catch {
      // No connection: the planned route stays on the map.
    }
  }

  private drawMap(ride: Ride): void {
    const el = this.mapEl()?.nativeElement;
    if (!el) return;
    const pickup: LatLng = { lat: +ride.pickup.lat, lng: +ride.pickup.lng };
    const destination: LatLng = { lat: +ride.destination.lat, lng: +ride.destination.lng };
    const me = isOver(ride) ? null : this.shift.position();
    const stale = this.positionStale();

    this.map ??= this.maps.create(el, pickup, 16);
    this.map.setMarker('pickup', pickup);
    this.map.setMarker('destination', destination);
    this.map.setMarker('driver', me, { glide: true });
    this.map.setMarkerStale('driver', stale);
    const lines = rideLines(ride.status, pickup, destination, me, stale, this.driven, roadPoints(ride.route));
    this.map.setLine('route', lines.route);
    this.map.setLine('approach', lines.approach);
    this.map.setLine('trail', lines.trail);

    // Before the trip: me + the pickup. From the start: the whole route. Re-framed only when
    // that changes, so the driver's own panning isn't undone every poll.
    const phase = this.heading() === 'pickup' && ride.status !== 'in_progress' ? 'pickup' : 'route';
    const framing = phase === 'pickup' && me ? 'pickup+me' : lines.trail ? 'trail' : phase;
    if (framing !== this.framing) {
      this.framing = framing;
      const points = phase === 'pickup' ? [pickup, ...(me ? [me] : [])] : [pickup, destination, ...(lines.trail ?? [])];
      setTimeout(() => {
        this.map?.resize();
        this.map?.fit(points, rideMapInset(el));
      }, 260);
    }
  }

  // ---------------------------------------------------------------- texts

  protected lineText(): string {
    const ride = this.ride();
    if (!ride) return '';
    const line = driverLine(ride);
    return this.i18n.t(line.key, line.params);
  }

  protected chosenWait(ride: Ride): string {
    if (ride.wait_minutes === null) return this.i18n.t('ride.waitUnsure');
    return ride.wait_minutes === 60 ? this.i18n.t('book.wait60') : this.i18n.t('book.waitMin', { n: ride.wait_minutes });
  }

  protected reasonKey(reason: DriverCancelReason): MessageKey {
    return `drive.reason.${reason}` as MessageKey;
  }

  /** The driver's own reason, translated (or as written, for older free-text reasons). */
  protected driverReason(reason: string): string {
    const key = driverReasonKey(reason);
    return key ? this.i18n.t(key) : reason;
  }

  /** The passenger's cancel reason (a stable code since Phase 10), in the driver's language. */
  protected passengerReason(ride: Ride): string | null {
    const known = ['driver_late', 'changed_plans', 'wrong_pickup', 'other'];
    if (!ride.cancel_reason) return null;
    return known.includes(ride.cancel_reason) ? this.i18n.t(`ride.reason.${ride.cancel_reason}` as MessageKey) : ride.cancel_reason;
  }

  protected directions(ride: Ride, to: 'pickup' | 'destination'): string {
    const place = to === 'pickup' ? ride.pickup : ride.destination;
    return directionsUrl(place.lat, place.lng);
  }

  // ---------------------------------------------------------------- actions

  /** The one primary button: the next step, exactly once (disabled while sending). */
  protected async step(): Promise<void> {
    const ride = this.ride();
    const next = this.next();
    if (!ride || !next || this.stepping() || Date.now() < this.guardUntil) return;
    this.stepping.set(true);
    this.actionError.set(null);
    try {
      this.onRide(await this.driverRides.step(ride.id, next.step));
      // The next step's button appears where a finger may still be: a double tap must never
      // skip a step (e.g. "Nandito na ako" + "Simulan ang biyahe" by accident).
      this.guardUntil = Date.now() + STEP_GUARD_MS;
      void Haptics.vibrate({ duration: 60 }).catch(() => undefined);
    } catch (e) {
      // e.g. the passenger cancelled a second ago: show why, and refresh to the server's truth.
      this.actionError.set((e as ApiError).message);
      void this.poll();
    } finally {
      this.stepping.set(false);
    }
  }

  protected openCancel(): void {
    this.cancelReason.set(null);
    this.actionError.set(null);
    this.cancelOpen.set(true);
  }

  protected async confirmCancel(): Promise<void> {
    const ride = this.ride();
    const reason = this.cancelReason();
    if (!ride || !reason || this.cancelling()) return;
    this.cancelling.set(true);
    try {
      this.onRide(await this.driverRides.cancel(ride.id, reason));
      this.cancelOpen.set(false);
    } catch (e) {
      this.actionError.set((e as ApiError).message);
      this.cancelOpen.set(false);
      void this.poll();
    } finally {
      this.cancelling.set(false);
    }
  }

  /** Balikan: the passenger never came back. Paid: the trip there + the waiting. */
  protected async confirmEnd(): Promise<void> {
    const ride = this.ride();
    if (!ride || this.ending()) return;
    this.ending.set(true);
    try {
      this.onRide(await this.driverRides.endAtDestination(ride.id, 'passenger_did_not_return'));
      this.endOpen.set(false);
    } catch (e) {
      this.actionError.set((e as ApiError).message);
      this.endOpen.set(false);
      void this.poll();
    } finally {
      this.ending.set(false);
    }
  }

  protected backHome(): void {
    void this.router.navigate(['/driver/home'], { replaceUrl: true });
  }
}
