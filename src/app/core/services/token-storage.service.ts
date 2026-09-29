import { Injectable } from '@angular/core';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';

/**
 * The ONLY place that touches the login token on the device.
 * On the phone it is stored encrypted with the Android Keystore; it is never put in SQLite,
 * plain Preferences, or logs (phase-0 § H). (In the browser, during development only,
 * the plugin falls back to localStorage.)
 */
@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  private static readonly KEY = 'papaya.auth_token';

  async get(): Promise<string | null> {
    try {
      return await SecureStorage.getItem(TokenStorageService.KEY);
    } catch {
      // A corrupted or unreadable entry (e.g. after an OS/Keystore change) = not logged in.
      await this.clear();
      return null;
    }
  }

  async set(token: string): Promise<void> {
    await SecureStorage.setItem(TokenStorageService.KEY, token);
  }

  async clear(): Promise<void> {
    try {
      await SecureStorage.removeItem(TokenStorageService.KEY);
    } catch {
      // Nothing stored: already cleared.
    }
  }
}
