import { Injectable, inject } from '@angular/core';
import { User } from '../../shared/models/user.model';
import { SQLiteService } from './sqlite.service';

/** The saved copy of the logged-in user, and when it was last confirmed by the API. */
export interface LocalUser {
  user: User;
  lastSyncedAt: Date;
}

/**
 * The phone's copy of the logged-in user (one at most). Used to open the right home screen at
 * startup and to show the name offline. It NEVER grants access: Laravel checks the token.
 *
 * Two versions behind one set of methods (Angular picks one, callers never know which):
 * SQLite on Android, memory in the browser (decision docs/phase-6-sqlite.md § 4).
 */
@Injectable({
  providedIn: 'root',
  useFactory: () => {
    const db = inject(SQLiteService);
    return db.isAvailable ? new SqliteLocalUserRepository(db) : new MemoryLocalUserRepository();
  },
})
export abstract class LocalUserRepository {
  /** Saves (or replaces) the local user. Only passengers and drivers use the app. */
  abstract save(user: User, syncedAt?: Date): Promise<void>;
  /** The saved user, or null if nobody is saved on this phone. */
  abstract get(): Promise<LocalUser | null>;
  /** Removes the saved user (logout, or the token was rejected). */
  abstract clear(): Promise<void>;

  protected assertStorable(user: User): void {
    if (user.role === 'admin') {
      throw new Error('Admin accounts are not stored on the phone.');
    }
  }
}

/** A row of the local_user table, exactly as SQLite returns it. */
interface LocalUserRow {
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: 'passenger' | 'driver';
  account_status: 'active' | 'suspended';
  last_synced_at: string;
}

export class SqliteLocalUserRepository extends LocalUserRepository {
  constructor(private readonly db: SQLiteService) {
    super();
  }

  async save(user: User, syncedAt = new Date()): Promise<void> {
    this.assertStorable(user);
    // slot is always 1, so a new login REPLACES the previous user instead of adding a second row.
    await this.db.run(
      `INSERT OR REPLACE INTO local_user
        (slot, user_id, first_name, last_name, email, phone, role, account_status, last_synced_at)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.id,
        user.first_name,
        user.last_name,
        user.email,
        user.phone,
        user.role,
        user.account_status,
        syncedAt.toISOString(),
      ],
    );
  }

  async get(): Promise<LocalUser | null> {
    const rows = await this.db.query<LocalUserRow>(
      `SELECT user_id, first_name, last_name, email, phone, role, account_status, last_synced_at
       FROM local_user WHERE slot = 1`,
    );
    const row = rows[0];
    if (!row) {
      return null;
    }
    return {
      user: {
        id: row.user_id,
        first_name: row.first_name,
        last_name: row.last_name,
        full_name: `${row.first_name} ${row.last_name}`, // derived, same rule as the API; not stored
        email: row.email,
        phone: row.phone,
        role: row.role,
        account_status: row.account_status,
      },
      lastSyncedAt: new Date(row.last_synced_at),
    };
  }

  async clear(): Promise<void> {
    await this.db.run('DELETE FROM local_user');
  }
}

/** Browser version: same behavior, kept in memory (gone after a page reload). */
export class MemoryLocalUserRepository extends LocalUserRepository {
  private saved: LocalUser | null = null;

  async save(user: User, syncedAt = new Date()): Promise<void> {
    this.assertStorable(user);
    this.saved = { user: { ...user }, lastSyncedAt: syncedAt };
  }

  async get(): Promise<LocalUser | null> {
    return this.saved ? { user: { ...this.saved.user }, lastSyncedAt: this.saved.lastSyncedAt } : null;
  }

  async clear(): Promise<void> {
    this.saved = null;
  }
}
