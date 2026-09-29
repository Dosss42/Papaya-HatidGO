import { Injectable } from '@angular/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';
import { SCHEMA } from './schema';

/** One SQL statement with its `?` values, for transaction(). */
export interface SqlStep {
  sql: string;
  params?: unknown[];
}

/**
 * The ONLY place that talks to the SQLite plugin. Everything else uses the repositories.
 *
 * - Opens the database `papaya_hatidgo` once (lazily, on first use); every caller awaits the same open.
 * - Upgrades the schema: runs each missing version of schema.ts in its own transaction.
 * - Android only (decision docs/phase-6-sqlite.md § 4). In the browser `isAvailable` is false and
 *   the repositories use their in-memory versions instead of calling this service.
 * - Values are always passed as `?` parameters, never glued into the SQL text (no SQL injection).
 */
@Injectable({ providedIn: 'root' })
export class SQLiteService {
  static readonly DB_NAME = 'papaya_hatidgo';

  readonly isAvailable = Capacitor.isNativePlatform();

  private readonly sqlite = new SQLiteConnection(CapacitorSQLite);
  private opening?: Promise<SQLiteDBConnection>;

  /** Runs an INSERT / UPDATE / DELETE. Returns the number of rows changed. */
  async run(sql: string, params: unknown[] = []): Promise<number> {
    const db = await this.connection();
    const result = await db.run(sql, params, true);
    return result.changes?.changes ?? 0;
  }

  /** Runs a SELECT. Each row is an object keyed by column name. */
  async query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    const db = await this.connection();
    const result = await db.query(sql, params);
    return (result.values ?? []) as T[];
  }

  /** Runs several statements as one unit: all of them, or (on any error) none of them. */
  async transaction(steps: readonly SqlStep[]): Promise<void> {
    const db = await this.connection();
    await this.inTransaction(db, steps);
  }

  /** The highest schema version applied on this phone (0 = none yet). */
  async schemaVersion(): Promise<number> {
    const rows = await this.query<{ version: number }>(
      'SELECT COALESCE(MAX(version), 0) AS version FROM schema_version',
    );
    return rows[0]?.version ?? 0;
  }

  private connection(): Promise<SQLiteDBConnection> {
    if (!this.isAvailable) {
      return Promise.reject(new Error('SQLite runs on Android only; use the repositories.'));
    }
    // If opening fails, forget the failed attempt so the next call can try again.
    this.opening ??= this.open().catch((err: unknown) => {
      this.opening = undefined;
      throw err;
    });
    return this.opening;
  }

  private async open(): Promise<SQLiteDBConnection> {
    const name = SQLiteService.DB_NAME;
    // After a WebView reload the native side may still hold the connection: reuse it if so.
    const consistent = (await this.sqlite.checkConnectionsConsistency()).result;
    const exists = (await this.sqlite.isConnection(name, false)).result;
    const db =
      consistent && exists
        ? await this.sqlite.retrieveConnection(name, false)
        : await this.sqlite.createConnection(name, false, 'no-encryption', 1, false);

    await db.open();
    await db.execute('PRAGMA foreign_keys = ON;', false); // enforce FKs (off by default in SQLite)
    await this.upgrade(db);
    return db;
  }

  /** Brings this phone's database up to the newest version in schema.ts. */
  private async upgrade(db: SQLiteDBConnection): Promise<void> {
    await db.execute(
      `CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY,
        description TEXT NOT NULL,
        applied_at TEXT NOT NULL
      );`,
      false,
    );
    const result = await db.query('SELECT COALESCE(MAX(version), 0) AS version FROM schema_version');
    const current: number = result.values?.[0]?.version ?? 0;

    for (const step of SCHEMA.filter((s) => s.version > current)) {
      // The version's tables AND its schema_version row are saved together, or not at all.
      // So a crash halfway never leaves a phone "between" versions.
      await this.inTransaction(db, [
        ...step.statements.map((sql) => ({ sql })),
        {
          sql: 'INSERT INTO schema_version (version, description, applied_at) VALUES (?, ?, ?)',
          params: [step.version, step.description, new Date().toISOString()],
        },
      ]);
    }
  }

  private async inTransaction(db: SQLiteDBConnection, steps: readonly SqlStep[]): Promise<void> {
    await db.beginTransaction();
    try {
      for (const step of steps) {
        await db.run(step.sql, step.params ?? [], false);
      }
      await db.commitTransaction();
    } catch (err) {
      await db.rollbackTransaction();
      throw err;
    }
  }
}
