import { Component, ElementRef, OnDestroy, computed, effect, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';
import { IonContent, IonFooter, IonIcon, IonRefresher, IonRefresherContent, IonSpinner, ViewWillEnter } from '@ionic/angular';
import { environment } from '../../../../../environments/environment';
import { addIcons } from 'ionicons';
import {
  alertCircle, batteryChargingOutline, callOutline, chevronForward, cloudOfflineOutline, ellipseOutline, locateOutline,
  lockClosedOutline, timeOutline, volumeHighOutline,
} from 'ionicons/icons';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { MessageKey } from '../../../../core/i18n/messages.en';
import { TranslatePipe } from '../../../../core/i18n/t.pipe';
import { AppLifecycleService } from '../../../../core/services/app-lifecycle.service';
import { AuthService } from '../../../../core/services/auth.service';
import { DriverDocumentsService } from '../../../../core/services/driver-documents.service';
import { DriverRideService } from '../../../../core/services/driver-ride.service';
import { DriverShiftService } from '../../../../core/services/driver-shift.service';
import { AppMap, MapService } from '../../../../core/services/map.service';
import { RideService } from '../../../../core/services/ride.service';
import { SubscriptionService } from '../../../../core/services/subscription.service';
import { VehicleService } from '../../../../core/services/vehicle.service';
import { Earnings } from '../../../../shared/models/driver-ride.model';
import { endingSoon, peso, phDate, subscriptionChip } from '../../../../shared/utilities/subscription-view';
import { OfflineNoticeComponent } from '../../../../shared/components/offline-notice/offline-notice.component';
import { StatusChipComponent } from '../../../../shared/components/status-chip/status-chip.component';
import { RequirementState } from '../../../../shared/models/driver.model';
import { ChipKind, EXPIRING_WITHIN_DAYS, nextStep, requirementView, stepsLeft } from '../../requirement-view';

interface ChecklistItem {
  title: MessageKey;
  status: string; // already translated
  kind: ChipKind;
  icon: string;
  link: string | null;
}

/**
 * Driver Home.
 * - Not ready yet (design-briefs/driver-requirements.md § 3 + § 6): the headline turns the
 *   server's compliance status into plain words, the checklist ① tricycle ② documents
 *   ③ subscription ④ go online mirrors the server's go-online checks, and ONE primary button
 *   always points to the most useful next action.
 * - Ready (verified + subscribed, Phase 11, design-briefs/driver-home.md): the work view.
 *   Offline / going online / online with a compact, low-cost map, today's earnings, Mag-online
 *   or Mag-offline. An active ride opens the ride screen instead.
 */
@Component({
  selector: 'app-driver-home',
  templateUrl: './driver-home.page.html',
  styleUrls: ['./driver-home.page.scss'],
  imports: [
    IonContent, IonFooter, IonIcon, IonRefresher, IonRefresherContent, IonSpinner,
    RouterLink, OfflineNoticeComponent, StatusChipComponent, TranslatePipe,
  ],
})
export class DriverHomePage implements ViewWillEnter, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly i18n = inject(I18nService);
  private readonly router = inject(Router);
  private readonly docs = inject(DriverDocumentsService);
  private readonly vehicles = inject(VehicleService);
  private readonly subs = inject(SubscriptionService);
  private readonly lifecycle = inject(AppLifecycleService);
  private readonly driverRides = inject(DriverRideService);
  private readonly rides = inject(RideService);
  private readonly maps = inject(MapService);
  protected readonly shift = inject(DriverShiftService);
  private inFlight: Promise<void> | null = null;

  private readonly mapEl = viewChild<ElementRef<HTMLElement>>('map');
  private map: AppMap | null = null;

  protected readonly loading = signal(false);
  protected readonly loadFailed = signal(false);
  /** "Ngayong araw: ₱540 · 9 biyahe" (GET /drivers/me/earnings?period=day). */
  protected readonly today = signal<Earnings | null>(null);
  protected readonly peso = peso;

  /** 0.8 / 3.4: one decimal is enough to decide. */
  protected km(value: number | string | null): string {
    return value === null ? '?' : (Math.round(Number(value) * 10) / 10).toFixed(1);
  }

  protected readonly online = computed(() => this.shift.state() === 'online');
  /**
   * The request board on Home (after Phase 13): ringing offers and board requests in one list,
   * nearest pickup first, one row per ride.
   */
  protected readonly requests = computed(() => {
    const seen = new Set<number>();
    return [...this.shift.offers(), ...this.shift.board()]
      .filter((o) => !seen.has(o.ride_id) && !!seen.add(o.ride_id))
      .sort((a, b) => (a.pickup.distance_from_you_km ?? 99) - (b.pickup.distance_from_you_km ?? 99));
  });
  /** Auto-accept choices: off, or a radius in km (the student's 2–5 km). */
  protected readonly autoChoices: (number | null)[] = [null, 2, 3, 5];
  /** The compact map: only while online with a position that was SENT, never a stale marker (brief § 2). */
  protected readonly showMap = computed(() => this.online() && !!this.shift.position() && !this.shift.gpsLost());

  protected readonly firstName = computed(() => this.auth.currentUser()?.first_name ?? '');
  private readonly checklist = computed(() => this.docs.checklist());
  private readonly tricycle = computed(() => this.vehicles.active());
  protected readonly suspended = computed(() => this.auth.currentUser()?.account_status === 'suspended');
  /** The admin's number for suspended drivers (environment; set before release, see the Phase 7 report). */
  protected readonly supportPhone = environment.supportPhone;

  /** The headline (brief § 6), words kept whole so "Mag-subscribe" never breaks at its hyphen. */
  protected readonly headlineWords = computed(() => this.headline().split(' '));
  protected readonly waiting = computed(() => this.checklist()?.compliance_status === 'under_review');

  protected readonly next = computed(() => {
    const list = this.checklist();
    return list && !this.suspended() ? nextStep(list, this.tricycle()) : null;
  });

  /** Papers + tricycle verified AND subscribed: nothing left but going online (Phase 11). */
  protected readonly ready = computed(
    () => !this.suspended() && this.checklist()?.compliance_status === 'verified' && this.subs.isActive(),
  );

  /** "Your subscription ends on …": active, ending within 3 days, no renewal bought yet. */
  protected readonly subscriptionEnding = computed(() => {
    const summary = this.subs.summary();
    return endingSoon(summary) && summary?.active_until
      ? this.i18n.t('sub.endingSoon', { date: phDate(summary.active_until) })
      : null;
  });

  protected readonly nextLabel = computed(() => {
    const step = this.next();
    if (!step || this.ready()) return null;
    switch (step.kind) {
      case 'fix': return this.i18n.t('home.next.fix', { doc: step.name });
      case 'renew': return this.i18n.t('home.next.renew', { doc: step.name });
      case 'upload': return this.i18n.t('home.next.upload', { doc: step.name });
      case 'addTricycle': return this.i18n.t('home.next.addTricycle');
      case 'subscribe': return this.i18n.t('home.next.verified');
    }
  });

  /**
   * The expiry banner (brief § 5). One paper: name it and link to it. Several: count them, with
   * the soonest date, and link to the list (a banner naming 1 of 3 would hide the other two).
   */
  protected readonly expiring = computed(() => {
    const soon = (this.checklist()?.requirements ?? [])
      .filter((r) => r.status === 'approved' && !r.renewal && (r.document?.days_until_expiry ?? 999) <= EXPIRING_WITHIN_DAYS)
      .sort((a, b) => (a.document?.days_until_expiry ?? 0) - (b.document?.days_until_expiry ?? 0));
    if (soon.length === 0) return null;
    const n = Math.max(soon[0].document?.days_until_expiry ?? 0, 0);
    return soon.length === 1
      ? { link: ['/driver/requirements', soon[0].requirement.code], text: this.i18n.t('home.expiring', { doc: soon[0].requirement.name, n }) }
      : { link: ['/driver/requirements'], text: this.i18n.t('home.expiringMany', { count: soon.length, n }) };
  });

  protected readonly items = computed<ChecklistItem[]>(() => {
    const list = this.checklist();
    const tricycle = this.tricycle();
    const rows = list?.requirements ?? [];
    const approved = rows.filter((r) => r.status === 'approved').length;
    const needsFix = rows.some((r) => ['rejected', 'resubmission_required', 'expired'].includes(r.status));
    const missing = rows.some((r) => r.status === 'missing');
    const allApproved = rows.length > 0 && approved === rows.length;
    // The mark tells the truth: missing papers aren't "under review" (the clock means Sinusuri).
    const docsKind: ChipKind = allApproved ? 'ok' : needsFix ? 'fix' : missing ? 'missing' : 'wait';
    const docsIcon = { ok: 'checkmark-circle', fix: 'close-circle', missing: 'ellipse-outline', wait: 'time-outline' }[docsKind as 'ok' | 'fix' | 'missing' | 'wait'];

    const tricycleItem: ChecklistItem = !tricycle
      ? { title: 'home.check.tricycle', status: this.i18n.t('home.status.none'), kind: 'missing', icon: 'ellipse-outline', link: '/driver/vehicle' }
      : tricycle.status === 'verified'
        ? { title: 'home.check.tricycle', status: this.i18n.t('home.status.done'), kind: 'ok', icon: 'checkmark-circle', link: '/driver/vehicle' }
        : tricycle.status === 'rejected'
          ? { title: 'home.check.tricycle', status: this.i18n.t('req.chip.fix'), kind: 'fix', icon: 'close-circle', link: '/driver/vehicle' }
          : { title: 'home.check.tricycle', status: this.i18n.t('req.chip.pending'), kind: 'wait', icon: 'time-outline', link: '/driver/vehicle' };

    return [
      tricycleItem,
      {
        title: 'home.check.documents',
        status: this.i18n.t('home.check.documentsCount', { done: approved, total: rows.length }),
        kind: docsKind,
        icon: docsIcon,
        link: '/driver/requirements',
      },
      this.subscriptionItem(),
      this.ready()
        ? { title: 'home.check.online', status: this.i18n.t('common.soon'), kind: 'locked', icon: 'time-outline', link: null }
        : { title: 'home.check.online', status: this.i18n.t('common.locked'), kind: 'locked', icon: 'lock-closed-outline', link: null },
    ];
  });

  /** ③ from GET /subscriptions/current: Active / Waiting for payment / Ended / Not subscribed. */
  private subscriptionItem(): ChecklistItem {
    const chip = subscriptionChip(this.subs.summary());
    return { title: 'home.check.subscription', status: this.i18n.t(chip.key), kind: chip.kind, icon: chip.icon, link: '/driver/subscription' };
  }

  /** The four documents as small chips under ② (brief § 3 wireframe). */
  protected readonly docChips = computed(() =>
    (this.checklist()?.requirements ?? []).map((r) => ({ name: r.requirement.name, view: requirementView(r, (iso) => iso) })),
  );

  constructor() {
    addIcons({
      alertCircle, batteryChargingOutline, callOutline, chevronForward, cloudOfflineOutline, ellipseOutline, locateOutline,
      lockClosedOutline, timeOutline, volumeHighOutline,
    });

    // The compact map: made when it appears, removed when it goes (offline = no map, brief § 2).
    // The marker moves only with each SENT position; the view moves only if it left the screen.
    effect(() => {
      const el = this.mapEl()?.nativeElement;
      const at = this.shift.position();
      if (!el || !at || !this.showMap()) {
        this.map?.destroy();
        this.map = null;
        return;
      }
      if (!this.map) {
        this.map = this.maps.create(el, at, 15);
        setTimeout(() => this.map?.resize());
      }
      this.map.setMarker('driver', at);
      if (!this.map.contains(at)) this.map.setView(at);
    });

    // Fresh whenever the driver lands on Home. (Ionic doesn't fire a TAB page's ionViewWillEnter
    // when coming back from a full-screen page like the upload screen, so listen to the router.)
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe((e) => {
        if (e.urlAfterRedirects.startsWith('/driver/home')) void this.load();
      });

    // …and when the app comes back to the front: the admin may have decided in the meantime.
    effect(() => {
      if (this.lifecycle.isActive()) void this.load();
    });
  }

  ionViewWillEnter(): void {
    void this.load();
  }

  ngOnDestroy(): void {
    this.map?.destroy();
  }

  /** One request at a time: the triggers above can fire together (e.g. first open). */
  protected load(event?: CustomEvent): Promise<void> {
    this.inFlight ??= this.fetch().finally(() => {
      this.inFlight = null;
      (event?.target as HTMLIonRefresherElement | undefined)?.complete();
    });
    return this.inFlight;
  }

  private async fetch(): Promise<void> {
    this.loading.set(!this.checklist());
    this.loadFailed.set(false);
    try {
      // The session too: suspension lives on the user account (/auth/me), not on the checklist.
      await Promise.all([this.docs.loadChecklist(), this.vehicles.load(), this.subs.loadCurrent(), this.auth.refreshSession()]);
    } catch {
      this.loadFailed.set(true);
    } finally {
      this.loading.set(false);
    }
    if (this.ready()) {
      this.shift.syncOffline();
      await Promise.all([this.resumeRide(), this.loadToday()]);
    }
  }

  /** A ride in progress (e.g. the app was closed mid-ride): its screen, not Home (brief § 5). */
  private async resumeRide(): Promise<void> {
    let ride;
    try {
      ride = await this.rides.active();
    } catch {
      return; // no internet: try again on the next visit
    }
    if (!ride) {
      // The ride ended while no ride screen was open (e.g. cancelled while on another tab).
      if (this.shift.rideId() !== null) this.shift.rideEnded();
      return;
    }
    if (!this.router.url.startsWith('/driver/home')) return;
    this.shift.startRide(ride.id);
    // Replace Home in the history, so Back from the ride screen doesn't bounce off Home again.
    void this.router.navigate(['/driver/ride', ride.id], { replaceUrl: true });
  }

  private async loadToday(): Promise<void> {
    try {
      this.today.set(await this.driverRides.earnings('day'));
    } catch {
      // Keep the last total; the pull-to-refresh tries again.
    }
  }

  /** "Nasaan ako?": back to the driver's last sent position. */
  protected locate(): void {
    const at = this.shift.position();
    if (at) this.map?.setView(at, 15);
  }

  protected forcedText(): string {
    const reason = this.shift.forced();
    return reason ? this.i18n.t(reason.key) : '';
  }

  protected goNext(): void {
    const step = this.next();
    if (!step) return;
    if (step.kind === 'subscribe') {
      void this.router.navigateByUrl('/driver/subscription');
      return;
    }
    void this.router.navigateByUrl(step.kind === 'addTricycle' ? '/driver/vehicle' : `/driver/requirements/${step.code}`);
  }

  private headline(): string {
    const list = this.checklist();
    if (this.suspended()) return this.i18n.t('home.head.suspended');
    if (!list) return this.i18n.t('home.head.default');

    const first = (pred: (r: RequirementState) => boolean) => list.requirements.find(pred)?.requirement.name ?? '';
    switch (list.compliance_status) {
      case 'pending_verification':
        return this.i18n.t('home.head.pending_count', { n: stepsLeft(list, this.tricycle()) });
      case 'under_review':
        return this.i18n.t('home.head.under_review_count', { n: list.requirements.filter((r) => r.status === 'pending').length || 1 });
      case 'rejected': {
        const doc = first((r) => r.status === 'rejected' || r.status === 'resubmission_required');
        return doc ? this.i18n.t('home.head.rejected_doc', { doc }) : this.i18n.t('home.head.rejected');
      }
      case 'expired':
        return this.i18n.t('home.head.expired_doc', { doc: first((r) => r.status === 'expired') });
      case 'verified':
        return this.i18n.t(this.subs.isActive() ? 'home.head.ready' : 'home.head.verified');
    }
  }
}
