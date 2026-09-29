import { TestBed } from '@angular/core/testing';
import { User } from '../../shared/models/user.model';
import { AppSettingsRepository, MemoryAppSettingsRepository } from './app-settings.repository';
import { LocalUserRepository, MemoryLocalUserRepository, SqliteLocalUserRepository } from './local-user.repository';
import { SQLiteService } from './sqlite.service';

const maria: User = {
  id: 7,
  first_name: 'Maria',
  last_name: 'Cruz',
  full_name: 'Maria Cruz',
  email: 'pasahero1@example.test',
  phone: '+639171234567',
  role: 'passenger',
  account_status: 'active',
};

/** Records every call and answers queries with prepared rows (no phone needed). */
class FakeDb {
  calls: { sql: string; params: unknown[] }[] = [];
  rows: unknown[] = [];
  async run(sql: string, params: unknown[] = []): Promise<number> {
    this.calls.push({ sql, params });
    return 1;
  }
  async query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    this.calls.push({ sql, params });
    return this.rows as T[];
  }
}

describe('MemoryLocalUserRepository (browser)', () => {
  it('saves, reads, replaces and clears one user', async () => {
    const repo = new MemoryLocalUserRepository();
    expect(await repo.get()).toBeNull();

    const at = new Date('2026-09-29T06:15:00Z');
    await repo.save(maria, at);
    expect(await repo.get()).toEqual({ user: maria, lastSyncedAt: at });

    await repo.save({ ...maria, id: 8, first_name: 'Juan', full_name: 'Juan Cruz', role: 'driver' });
    expect((await repo.get())?.user.first_name).toBe('Juan'); // replaced, not added

    await repo.clear();
    expect(await repo.get()).toBeNull();
  });

  it('refuses admin accounts', async () => {
    await expect(new MemoryLocalUserRepository().save({ ...maria, role: 'admin' })).rejects.toThrow();
  });
});

describe('SqliteLocalUserRepository (Android)', () => {
  it('writes slot 1 with ? parameters (never values inside the SQL text)', async () => {
    const db = new FakeDb();
    const repo = new SqliteLocalUserRepository(db as unknown as SQLiteService);

    await repo.save(maria, new Date('2026-09-29T06:15:00Z'));

    const { sql, params } = db.calls[0];
    expect(sql).toContain('INSERT OR REPLACE INTO local_user');
    expect(sql).not.toContain('Maria');
    expect(params).toEqual([7, 'Maria', 'Cruz', 'pasahero1@example.test', '+639171234567', 'passenger', 'active', '2026-09-29T06:15:00.000Z']);
  });

  it('turns a row back into a User, rebuilding full_name like the API', async () => {
    const db = new FakeDb();
    db.rows = [
      {
        user_id: 7,
        first_name: 'Maria',
        last_name: 'Cruz',
        email: 'pasahero1@example.test',
        phone: '+639171234567',
        role: 'passenger',
        account_status: 'active',
        last_synced_at: '2026-09-29T06:15:00.000Z',
      },
    ];
    const saved = await new SqliteLocalUserRepository(db as unknown as SQLiteService).get();

    expect(saved?.user).toEqual(maria);
    expect(saved?.lastSyncedAt.toISOString()).toBe('2026-09-29T06:15:00.000Z');
  });

  it('returns null when the table is empty', async () => {
    expect(await new SqliteLocalUserRepository(new FakeDb() as unknown as SQLiteService).get()).toBeNull();
  });

  it('refuses admin accounts before touching the database', async () => {
    const db = new FakeDb();
    await expect(new SqliteLocalUserRepository(db as unknown as SQLiteService).save({ ...maria, role: 'admin' })).rejects.toThrow();
    expect(db.calls).toHaveLength(0);
  });
});

describe('Which version Angular gives', () => {
  it('gives the memory versions outside Android (tests and the browser)', () => {
    expect(TestBed.inject(LocalUserRepository)).toBeInstanceOf(MemoryLocalUserRepository);
    expect(TestBed.inject(AppSettingsRepository)).toBeInstanceOf(MemoryAppSettingsRepository);
  });
});
