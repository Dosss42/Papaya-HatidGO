import { MemoryAppSettingsRepository, SqliteAppSettingsRepository } from './app-settings.repository';
import { SQLiteService } from './sqlite.service';

describe('MemoryAppSettingsRepository (browser)', () => {
  it('gets, sets, replaces and removes a value', async () => {
    const repo = new MemoryAppSettingsRepository();
    expect(await repo.get('onboarding_seen')).toBeNull();

    await repo.set('onboarding_seen', '0');
    await repo.set('onboarding_seen', '1');
    expect(await repo.get('onboarding_seen')).toBe('1');

    await repo.remove('onboarding_seen');
    expect(await repo.get('onboarding_seen')).toBeNull();
  });

  it('stores yes/no settings as 1 / 0', async () => {
    const repo = new MemoryAppSettingsRepository();
    expect(await repo.getFlag('onboarding_seen')).toBe(false); // never set = no

    await repo.setFlag('onboarding_seen', true);
    expect(await repo.get('onboarding_seen')).toBe('1');
    expect(await repo.getFlag('onboarding_seen')).toBe(true);
  });
});

describe('SqliteAppSettingsRepository (Android)', () => {
  it('uses ? parameters for the key and the value', async () => {
    const calls: { sql: string; params: unknown[] }[] = [];
    const db = {
      run: async (sql: string, params: unknown[] = []) => (calls.push({ sql, params }), 1),
      query: async (sql: string, params: unknown[] = []) => (calls.push({ sql, params }), [{ value: '1' }]),
    };
    const repo = new SqliteAppSettingsRepository(db as unknown as SQLiteService);

    await repo.set('onboarding_seen', '1');
    expect(await repo.get('onboarding_seen')).toBe('1');

    expect(calls[0].sql).toContain('INSERT OR REPLACE INTO app_settings');
    expect(calls[0].params.slice(0, 2)).toEqual(['onboarding_seen', '1']);
    expect(calls[1]).toEqual({ sql: 'SELECT value FROM app_settings WHERE key = ?', params: ['onboarding_seen'] });
  });
});
