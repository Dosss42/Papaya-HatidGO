import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, firstValueFrom, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, MeResponse, RegisterPayload, SessionState } from '../../shared/models/auth.model';
import { Role, User } from '../../shared/models/user.model';
import { ApiError, toApiError } from '../../shared/utilities/api-error';
import { TokenStorageService } from './token-storage.service';

/**
 * The single source of truth for "who is logged in" on the phone.
 * Talks to /api/v1/auth/*, keeps the token in secure storage (TokenStorageService),
 * and exposes the session as signals for guards and pages. Pages never call the auth API directly.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly tokens = inject(TokenStorageService);
  private readonly base = `${environment.apiUrl}/auth`;
  private static readonly DEVICE_NAME = 'papaya-mobile';
  private static readonly TIMEOUT_MS = 15_000;

  private readonly user = signal<User | null>(null);
  private readonly me = signal<MeResponse | null>(null);
  private readonly state = signal<SessionState>('unknown');
  /** In-memory copy for the interceptor (reading secure storage on every request would be slow). */
  private accessToken: string | null = null;

  // Read-only views (the same names the guards used in Phase 2, so guards need no change).
  readonly currentUser = this.user.asReadonly();
  readonly session = this.me.asReadonly();
  readonly sessionState = this.state.asReadonly();
  readonly isLoggedIn = computed(() => this.user() !== null);
  readonly role = computed(() => this.user()?.role ?? null);

  /** Used by authInterceptor to attach "Authorization: Bearer …". */
  token(): string | null {
    return this.accessToken;
  }

  /**
   * Runs once at app start (before the first screen is chosen): turn a saved token back into a
   * logged-in user. Never throws: the app must always be able to start.
   */
  async restoreSession(): Promise<SessionState> {
    const saved = await this.tokens.get();
    if (!saved) {
      this.state.set('guest');
      return 'guest';
    }

    this.accessToken = saved;
    try {
      await this.loadMe();
      this.state.set('authenticated');
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) {
        await this.clearSession(); // expired or revoked: the saved token is useless
        this.state.set('guest');
      } else {
        // No internet (or server down) at startup: KEEP the token so the next start can restore it.
        // Until a local user cache exists (Phase 6, SQLite), the app shows the guest screens meanwhile.
        this.state.set('offline');
      }
    }
    return this.state();
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
    this.state.set('guest');
    await this.tokens.clear();
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

  private async startSession(response: AuthResponse): Promise<User> {
    // The mobile app is for passengers and drivers. Admins use the web dashboard.
    if (response.user.role === 'admin') {
      this.accessToken = response.token;
      await this.logout(); // don't leave an unused admin token alive on the server
      throw {
        status: 403,
        code: 'ADMIN_NOT_ALLOWED',
        message: 'Para sa pasahero at driver ang app na ito. Gamitin ang admin dashboard.',
        fieldErrors: {},
      } satisfies ApiError;
    }

    this.accessToken = response.token;
    await this.tokens.set(response.token);
    this.user.set(response.user);
    this.state.set('authenticated');

    try {
      await this.loadMe(); // driver compliance + subscription, for routing and gates
    } catch {
      // Not fatal right after login: the user is known; details load again on the next start.
    }
    return response.user;
  }

  private async loadMe(): Promise<void> {
    const me = await firstValueFrom(
      this.http.get<MeResponse>(`${this.base}/me`).pipe(timeout(AuthService.TIMEOUT_MS)),
    );
    this.me.set(me);
    this.user.set(me.user);
  }

  /** Runs an API call with a timeout and converts any failure into an ApiError. */
  private async request<T>(call: Observable<T>): Promise<T> {
    try {
      return await firstValueFrom(call.pipe(timeout(AuthService.TIMEOUT_MS)));
    } catch (err) {
      throw toApiError(err);
    }
  }
}
