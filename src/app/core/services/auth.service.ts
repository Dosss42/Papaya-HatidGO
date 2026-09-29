import { Injectable, computed, signal } from '@angular/core';
import { Role, User } from '../../shared/models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  // The logged-in user, or null. Writable only inside this service.
  private readonly user = signal<User | null>(null);

  // Read-only views for guards and pages.
  readonly currentUser = this.user.asReadonly();
  readonly isLoggedIn = computed(() => this.user() !== null);
  readonly role = computed(() => this.user()?.role ?? null);

  /**
   * TEMPORARY (Phase 2 only): pretend to log in so routing and guards can be tested.
   * Replaced in Phase 5 by a real login(email, password) that calls Laravel.
   */
  fakeLogin(role: 'passenger' | 'driver'): void {
    this.user.set({
      id: 0,
      name: role === 'driver' ? 'Test Driver' : 'Test Pasahero',
      email: `${role}@test.local`,
      phone: '09000000000',
      role,
    });
  }

  logout(): void {
    this.user.set(null);
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
}
