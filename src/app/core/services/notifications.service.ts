import { HttpClient } from '@angular/common/http';
import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { ActionPerformed, PushNotifications, PushNotificationSchema, Token } from '@capacitor/push-notifications';
import { ToastController } from '@ionic/angular';
import { filter, firstValueFrom, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { showWhileOpen, targetUrl } from '../../features/notifications/alert-view';
import { AlertPage, AppAlert, PushData, PushPermission } from '../../shared/models/notification.model';
import { Role } from '../../shared/models/user.model';
import { AppSettingsRepository } from '../database/app-settings.repository';
import { I18nService } from '../i18n/i18n.service';
import { apiCall } from './api-call';
import { AppLifecycleService } from './app-lifecycle.service';

/** The badge is checked this often while the app is open (decision #9), and at once on return. */
export const UNREAD_EVERY_MS = 60_000;

/**
 * Notifications on the phone (Phase 13): the Alerts list, the unread badge, and push.
 *
 * Push is a bonus on top of polling (phase-0 § J): with push refused or Google unreachable, every
 * screen still works and the Alerts list still fills. Started by AppComponent once a passenger or
 * driver is logged in, stopped at logout. The server forgets this phone at logout by itself (the
 * device token belongs to the login, decision #5), so logging out needs no call here.
 */
@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly http = inject(HttpClient);
  private readonly i18n = inject(I18nService);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastController);
  private readonly settings = inject(AppSettingsRepository);
  private readonly lifecycle = inject(AppLifecycleService);
  private readonly base = environment.apiUrl;
  private readonly native = Capacitor.isNativePlatform();

  private role: Role | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private listening = false;
  /** This phone's FCM token (it changes rarely; sent again after each login and language change). */
  private pushToken: string | null = null;

  /** Unread alerts (the Alerts tab badge). */
  readonly unread = signal(0);
  /** 'unknown' until Android answers (no "notifications are off" card before we know, finish review #4). */
  readonly permission = signal<PushPermission>(this.native ? 'unknown' : 'unsupported');
  /** The one-time explanation before Android's own question (decision #7). */
  readonly askNow = signal(false);

  private readonly t = (k: Parameters<I18nService['t']>[0]) => this.i18n.t(k);

  constructor() {
    // The permission is a fact about the phone, known without the API (even on an offline start).
    void this.checkPermission();

    // Back in the app: the badge may be old, and the permission may have changed in Settings.
    let wasActive = true;
    effect(() => {
      const active = this.lifecycle.isActive();
      if (active && !wasActive && untracked(() => this.role)) {
        untracked(() => {
          void this.refreshUnread();
          void this.checkPermission();
        });
      }
      wasActive = active;
    });
    // The push text follows the phone's language: tell the server when it changes.
    effect(() => {
      const lang = this.i18n.lang();
      if (untracked(() => this.role && this.pushToken)) untracked(() => void this.sendToken(this.pushToken!, lang));
    });
  }

  // ------------------------------------------------------------------ session

  /** A passenger or driver is logged in (and the API answered). */
  async start(role: Role): Promise<void> {
    if (this.role === role) return;
    this.role = role;
    void this.refreshUnread();
    this.timer ??= setInterval(() => {
      if (this.lifecycle.isActive()) void this.refreshUnread();
    }, UNREAD_EVERY_MS);

    if (!this.native) return;
    await this.listen();
    await this.checkPermission(); // granted → registers (→ 'registration' with the token)
    if (this.permission() === 'prompt' && !(await this.settings.getFlag('push_asked').catch(() => true))) {
      this.askNow.set(true);
    }
  }

  /**
   * Logout: forget the badge, clear the shade, and unregister this phone from Firebase. The server
   * already drops the phone with the login; unregistering also covers a logout made OFFLINE (the
   * login survives on the server): Google then calls the old token dead and the server deletes it,
   * so the next person on this phone never sees the previous user's notifications (finish review #3).
   */
  stop(): void {
    const wasStarted = this.role !== null;
    this.role = null;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.unread.set(0);
    this.askNow.set(false);
    if (this.native && wasStarted) {
      this.pushToken = null;
      void PushNotifications.removeAllDeliveredNotifications().catch(() => undefined);
      void PushNotifications.unregister().catch(() => undefined);
    }
  }

  // ------------------------------------------------------------------ permission

  /** "Allow notifications" on the explanation sheet or the Alerts card: Android asks now. */
  async allow(): Promise<void> {
    this.askNow.set(false);
    await this.settings.setFlag('push_asked', true).catch(() => undefined);
    if (!this.native) return;
    try {
      const result = await PushNotifications.requestPermissions();
      this.permission.set(result.receive === 'granted' ? 'granted' : result.receive === 'denied' ? 'denied' : 'prompt');
      if (result.receive === 'granted') await PushNotifications.register();
    } catch {
      this.permission.set('denied');
    }
  }

  /** "Not now": asked once; the Alerts card still offers it later. */
  async later(): Promise<void> {
    this.askNow.set(false);
    await this.settings.setFlag('push_asked', true).catch(() => undefined);
  }

  private async checkPermission(): Promise<void> {
    if (!this.native) return;
    try {
      const { receive } = await PushNotifications.checkPermissions();
      // 'prompt-with-rationale' = refused once, Android may still ask again: treated like "not yet".
      this.permission.set(receive === 'granted' ? 'granted' : receive === 'denied' ? 'denied' : 'prompt');
      if (receive === 'granted' && this.role && !this.pushToken) await PushNotifications.register();
    } catch {
      // Unknown: keep the last value.
    }
  }

  // ------------------------------------------------------------------ the Alerts list

  async list(page = 1): Promise<AlertPage> {
    const res = await apiCall(this.http.get<AlertPage>(`${this.base}/notifications`, { params: { page } }), this.t);
    this.unread.set(res.meta.unread);
    return res;
  }

  async refreshUnread(): Promise<void> {
    try {
      const n = await apiCall(
        this.http.get<{ data: { unread: number } }>(`${this.base}/notifications/unread-count`).pipe(map((r) => r.data.unread)),
        this.t,
      );
      this.unread.set(n);
    } catch {
      // Offline: the badge keeps its last number.
    }
  }

  async markRead(id: string): Promise<AppAlert> {
    const alert = await apiCall(
      this.http.patch<{ data: AppAlert }>(`${this.base}/notifications/${id}/read`, {}).pipe(map((r) => r.data)),
      this.t,
    );
    void this.refreshUnread(); // the server's count, not a guess: it may have been read already (review #8)
    return alert;
  }

  async markAllRead(): Promise<void> {
    await apiCall(this.http.post(`${this.base}/notifications/read-all`, {}), this.t);
    this.unread.set(0);
  }

  /** The screen a notification leads to (in the logged-in role's area). */
  urlFor(target: string | null | undefined): string | null {
    return this.role ? targetUrl(this.role, target) : null;
  }

  // ------------------------------------------------------------------ push

  private async listen(): Promise<void> {
    if (this.listening) return;
    this.listening = true;
    await this.createChannels();
    await PushNotifications.addListener('registration', (token: Token) => {
      this.pushToken = token.value;
      if (this.role) void this.sendToken(token.value, this.i18n.lang());
    });
    await PushNotifications.addListener('registrationError', () => {
      // No Google Play services, or no internet: the app works without push (never log the token).
      console.warn('Push registration failed');
    });
    await PushNotifications.addListener('pushNotificationReceived', (push) => void this.whileOpen(push));
    await PushNotifications.addListener('pushNotificationActionPerformed', (action) => void this.tapped(action));
  }

  /** Android channels (decision #6): rides ring and pop up; reminders arrive quietly. */
  private async createChannels(): Promise<void> {
    try {
      await PushNotifications.createChannel({
        id: 'rides',
        name: this.i18n.t('push.channelRides'),
        description: this.i18n.t('push.channelRidesHint'),
        importance: 5,
        visibility: 1,
        sound: 'default',
        vibration: true,
      });
      await PushNotifications.createChannel({
        id: 'general',
        name: this.i18n.t('push.channelGeneral'),
        description: this.i18n.t('push.channelGeneralHint'),
        importance: 3,
        visibility: 0,
      });
    } catch {
      // Android below 8 has no channels.
    }
  }

  private async sendToken(token: string, locale: string): Promise<void> {
    try {
      await apiCall(this.http.post(`${this.base}/device-tokens`, { token, platform: 'android', locale }), this.t);
    } catch {
      // Sent again at the next start; meanwhile the Alerts list still works.
    }
  }

  /** The app is open: a short message (unless the screen already shows it), and a fresh badge. */
  private async whileOpen(push: PushNotificationSchema): Promise<void> {
    void this.refreshUnread();
    const data = (push.data ?? {}) as PushData;
    if (!showWhileOpen(data.kind, data.target, this.router.url) || !push.title) return;

    const toast = await this.toasts.create({
      header: push.title,
      message: push.body,
      duration: 10_000, // long enough to read three lines and reach "View" (finish review #6)
      position: 'top',
      cssClass: 'hg-toast',
      buttons: [{ text: this.i18n.t('alerts.view'), handler: () => void this.open(data) }],
    });
    await toast.present();
  }

  /** A notification in the shade was tapped: open its screen (after the app's first navigation). */
  private async tapped(action: ActionPerformed): Promise<void> {
    const data = (action.notification.data ?? {}) as PushData;
    if (!this.router.navigated) {
      await firstValueFrom(this.router.events.pipe(filter((e) => e instanceof NavigationEnd)));
    }
    await this.open(data);
  }

  private async open(data: PushData): Promise<void> {
    if (data.notification_id) void this.markRead(data.notification_id).catch(() => undefined);
    const url = this.urlFor(data.target);
    if (url) await this.router.navigateByUrl(url);
  }
}
