import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, firstValueFrom, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, MeResponse, RegisterPayload, SessionState } from '../../shared/models/auth.model';
import { Role, User } from '../../shared/models/user.model';
import { ApiError, toApiError } from '../../shared/utilities/api-error';
import { AppSettingsRepository } from '../database/app-settings.repository';
import { LocalUserRepository } from '../database/local-user.repository';
import { I18nService } from '../i18n/i18n.service';
import { DriverDocumentsService } from './driver-documents.service';
import { SubscriptionService } from './subscription.service';
import { TokenStorageService } from './token-storage.service';
import { VehicleService } from './vehicle.service';

/**
 * The single source of truth for "who is logged in" on the phone.
 * Talks to /api/v1/auth/*, keeps the token in secure storage (TokenStorageService), keeps a copy of
 * the user in SQLite (LocalUserRepository) for offline starts, and exposes the session as signals
 * for guards and pages. Pages never call the auth API directly.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly tokens = inject(TokenStorageService);
  private readonly localUser = inject(LocalUserRepository);
  private readonly settings = inject(AppSettingsRepository);
  private readonly i18n = inject(I18nService);
  private readonly router = inject(Router);
  private readonly vehicles = inject(VehicleService);
  private readonly documents = inject(DriverDocumentsService);
  private readonly subscriptions = inject(SubscriptionService);
  private readonly base = `${environment.apiUrl}/auth`;
  private static readonly DEVICE_NAME = 'papaya-mobile';
  private static readonly TIMEOUT_MS = 15_000;
  /** At startup the user is waiting on a blank screen: give up sooner and open from the saved copy. */
  private static readonly STARTUP_TIMEOUT_MS = 6_000;

  private readonly user = signal<User | null>(null);
  private readonly me = signal<MeResponse | null>(null);
  private readonly state = signal<SessionState>('unknown');
  private readonly syncedAt = signal<Date | null>(null);
  /** Has anyone logged in on this phone before? (app_settings.onboarding_seen, read at startup) */
  private readonly onboardingSeen = signal(false);
  /** In-memory copy for the interceptor (reading secure storage on every request would be slow). */
  private accessToken: string | null = null;

  // Read-only views (the same names the guards used in Phase 2, so guards need no change).
  readonly currentUser = this.user.asReadonly();
  readonly session = this.me.asReadonly();
  readonly sessionState = this.state.asReadonly();
  readonly isLoggedIn = computed(() => this.user() !== null);
  readonly role = computed(() => this.user()?.role ?? null);
  /** True when the user shown is the saved copy, because the API could not be reached. */
  readonly isOffline = computed(() => this.state() === 'offline' && this.user() !== null);
  /** When the API last confirmed the user (shown as "huling update 2:15 PM" while offline). */
  readonly lastSynced = this.syncedAt.asReadonly();

  /** Used by authInterceptor to attach "Authorization: Bearer …". */
  token(): string | null {
    return this.accessToken;
  }

  /**
   * Runs once at app start (before the first screen is chosen): turn a saved token back into a
   * logged-in user. Never throws: the app must always be able to start.
   */
  async restoreSession(): Promise<SessionState> {
    this.onboardingSeen.set(await this.readOnboardingSeen());

    const saved = await this.tokens.get();
    if (!saved) {
      this.state.set('guest');
      return 'guest';
    }

    this.accessToken = saved;
    // A saved token proves someone logged in on this phone before (also covers phones that were
    // logged in before Phase 6 added the flag).
    await this.markOnboardingSeen();
    try {
      await this.loadMe(AuthService.STARTUP_TIMEOUT_MS);
      this.state.set('authenticated');
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) {
        await this.clearSession(); // expired or revoked: the saved token is useless
        this.state.set('guest');
      } else {
        // No internet (or server down) at startup: KEEP the token, and show the saved copy of the
        // user so the right home screen opens. It only picks the screen; the API still checks
        // the token on every real action. No saved copy → guest screens until the API is back.
        const saved = await this.readLocalUser();
        if (saved) {
          this.user.set(saved.user);
          this.syncedAt.set(saved.lastSyncedAt);
        }
        this.state.set('offline');
      }
    }
    return this.state();
  }

  /**
   * Try to leave offline mode: ask the API again ("Subukan ulit", or the connection came back).
   * @returns true when the API confirmed the session.
   */
  async refreshSession(): Promise<boolean> {
    if (!this.accessToken) {
      return false;
    }
    try {
      await this.loadMe();
      this.state.set('authenticated');
      return true;
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) {
        // The token was revoked while we were offline (e.g. password reset on another phone).
        await this.clearSession();
        await this.router.navigateByUrl('/auth/login', { replaceUrl: true });
      }
      return false;
    }
  }

  /** @throws ApiError (e.g. INVALID_CREDENTIALS, ACCOUNT_SUSPENDED, NETWORK, TOO_MANY_ATTEMPTS) */
  async login(login: string, password: string): Promise<User> {
    const response = await this.request(
      this.http.post<AuthResponse>(`${this.base}/login`, {
        login: login.trim(),
        password,
        device_name: AuthService.DEVICE_NAME,
      }),
    );
    return this.startSession(response);
  }

  /** @throws ApiError (VALIDATION_FAILED with fieldErrors, NETWORK, …) */
  async register(payload: RegisterPayload): Promise<User> {
    const response = await this.request(
      this.http.post<AuthResponse>(`${this.base}/register`, { ...payload, device_name: AuthService.DEVICE_NAME }),
    );
    return this.startSession(response);
  }

  /** Step 1 of "forgot password": the API always answers the same way (no account enumeration). */
  async forgotPassword(email: string): Promise<string> {
    const res = await this.request(
      this.http.post<{ message: string }>(`${this.base}/forgot-password`, { email: email.trim() }),
    );
    return res.message;
  }

  /** Step 2: the 6-digit code + a new password. Logs out every device (the API revokes all tokens). */
  async resetPassword(email: string, code: string, password: string, passwordConfirmation: string): Promise<string> {
    const res = await this.request(
      this.http.post<{ message: string }>(`${this.base}/reset-password`, {
        email: email.trim(),
        code,
        password,
        password_confirmation: passwordConfirmation,
      }),
    );
    return res.message;
  }

  /** Revokes the token on the server when possible; the phone forgets it no matter what. */
  async logout(): Promise<void> {
    try {
      await this.request(this.http.post<void>(`${this.base}/logout`, {}));
    } catch {
      // Offline or already expired: the local logout below still happens.
    }
    await this.clearSession();
  }

  /** Forget everything locally (also used by the interceptor on a 401). */
  async clearSession(): Promise<void> {
    this.accessToken = null;
    this.user.set(null);
    this.me.set(null);
    this.syncedAt.set(null);
    this.state.set('guest');
    // The next person on this phone must never see the previous driver's tricycle, papers or payments.
    this.vehicles.clear();
    this.documents.clear();
    this.subscriptions.clear();
    await this.tokens.clear();
    try {
      await this.localUser.clear();
    } catch {
      // Could not reach the local database: the token is gone, so the saved copy opens nothing.
    }
  }

  /** Home URL for a role, or null when the role has no home in the mobile app (admin). */
  homeUrlFor(role: Role | null): string | null {
    switch (role) {
      case 'passenger':
        return '/passenger';
      case 'driver':
        return '/driver';
      default:
        return null;
    }
  }

  /**
   * Where a logged-out person starts: Get Started the first time on this phone, Login after
   * someone has logged in here once (decision docs/phase-6-sqlite.md § 4, #3).
   */
  guestStartUrl(): string {
    return this.onboardingSeen() ? '/auth/login' : '/auth/welcome';
  }

  private async startSession(response: AuthResponse): Promise<User> {
    // The mobile app is for passengers and drivers. Admins use the web dashboard.
    if (response.user.role === 'admin') {
      this.accessToken = response.token;
      await this.logout(); // don't leave an unused admin token alive on the server
      throw {
        status: 403,
        code: 'ADMIN_NOT_ALLOWED',
        message: this.i18n.t('error.adminNotAllowed'),
        fieldErrors: {},
      } satisfies ApiError;
    }

    this.accessToken = response.token;
    await this.tokens.set(response.token);
    this.user.set(response.user);
    this.state.set('authenticated');
    await this.saveLocalUser(response.user);
    await this.markOnboardingSeen();

    try {
      await this.loadMe(); // driver compliance + subscription, for routing and gates
    } catch {
      // Not fatal right after login: the user is known; details load again on the next start.
    }
    return response.user;
  }

  private async loadMe(timeoutMs = AuthService.TIMEOUT_MS): Promise<void> {
    const me = await firstValueFrom(
      this.http.get<MeResponse>(`${this.base}/me`).pipe(timeout(timeoutMs)),
    );
    this.me.set(me);
    this.user.set(me.user);
    await this.saveLocalUser(me.user);
  }

  /** Keep the SQLite copy current. A local storage failure must never block a login. */
  private async saveLocalUser(user: User): Promise<void> {
    const now = new Date();
    this.syncedAt.set(now);
    try {
      await this.localUser.save(user, now);
    } catch (err) {
      console.warn('Could not save the local user copy', err);
    }
  }

  private async markOnboardingSeen(): Promise<void> {
    if (this.onboardingSeen()) {
      return;
    }
    this.onboardingSeen.set(true);
    try {
      await this.settings.setFlag('onboarding_seen', true);
    } catch (err) {
      console.warn('Could not save onboarding_seen', err);
    }
  }

  private async readOnboardingSeen(): Promise<boolean> {
    try {
      return await this.settings.getFlag('onboarding_seen');
    } catch (err) {
      console.warn('Could not read onboarding_seen', err);
      return false; // worst case: Get Started is shown once more
    }
  }

  private async readLocalUser() {
    try {
      return await this.localUser.get();
    } catch (err) {
      console.warn('Could not read the local user copy', err);
      return null;
    }
  }

  /** Runs an API call with a timeout and converts any failure into an ApiError. */
  private async request<T>(call: Observable<T>): Promise<T> {
    try {
      return await firstValueFrom(call.pipe(timeout(AuthService.TIMEOUT_MS)));
    } catch (err) {
      throw toApiError(err, (key) => this.i18n.t(key));
    }
  }
}
