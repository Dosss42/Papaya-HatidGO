import { Injectable, inject } from '@angular/core';
import { SQLiteService } from './sqlite.service';

/**
 * Every setting the app knows. A new setting is added here first, so a typo like
 * 'onbording_seen' is a compile error instead of a silently missing value.
 */
export type SettingKey =
  | 'onboarding_seen' // '1' once this phone has seen Get Started and logged in → guests start at Login
  | 'language' // 'en' | 'fil': the app's language, chosen on Get Started or in Account (I18nService)
  | 'diag_test'; // dev Diagnostics CRUD test only: created and removed again by the test

/**
 * Device preferences (key → text value). Kept on logout: they belong to the phone, not the user.
 * SQLite on Android, memory in the browser (decision docs/phase-6-sqlite.md § 4).
 */
@Injectable({
  providedIn: 'root',
  useFactory: () => {
    const db = inject(SQLiteService);
    return db.isAvailable ? new SqliteAppSettingsRepository(db) : new MemoryAppSettingsRepository();
  },
})
export abstract class AppSettingsRepository {
  /** The saved value, or null if the setting was never set. */
  abstract get(key: SettingKey): Promise<string | null>;
  /** Saves (or replaces) a value. */
  abstract set(key: SettingKey, value: string): Promise<void>;
  /** Removes a setting (it reads as null again). */
  abstract remove(key: SettingKey): Promise<void>;

  /** Yes/no settings are stored as '1' / '0'. */
  async getFlag(key: SettingKey): Promise<boolean> {
    return (await this.get(key)) === '1';
  }

  async setFlag(key: SettingKey, on: boolean): Promise<void> {
    await this.set(key, on ? '1' : '0');
  }
}

export class SqliteAppSettingsRepository extends AppSettingsRepository {
  constructor(private readonly db: SQLiteService) {
    super();
  }

  async get(key: SettingKey): Promise<string | null> {
    const rows = await this.db.query<{ value: string }>('SELECT value FROM app_settings WHERE key = ?', [key]);
    return rows[0]?.value ?? null;
  }

  async set(key: SettingKey, value: string): Promise<void> {
    await this.db.run('INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)', [
      key,
      value,
      new Date().toISOString(),
    ]);
  }

  async remove(key: SettingKey): Promise<void> {
    await this.db.run('DELETE FROM app_settings WHERE key = ?', [key]);
  }
}

/** Browser version: same behavior, kept in memory (gone after a page reload). */
export class MemoryAppSettingsRepository extends AppSettingsRepository {
  private readonly values = new Map<SettingKey, string>();

  async get(key: SettingKey): Promise<string | null> {
    return this.values.get(key) ?? null;
  }

  async set(key: SettingKey, value: string): Promise<void> {
    this.values.set(key, value);
  }

  async remove(key: SettingKey): Promise<void> {
    this.values.delete(key);
  }
}
