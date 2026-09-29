/**
 * The local SQLite schema, as numbered upgrade steps (like Laravel migrations, but on the phone).
 *
 * Rules:
 * - A phone runs only the versions it hasn't run yet (SQLiteService checks `schema_version`).
 * - NEVER edit a version that has shipped: phones that already ran it would not run it again.
 *   To change a table, APPEND a new version (ALTER TABLE, or create + copy + drop).
 * - Only data that is useful offline, safe if a bit old, and not sensitive (phase-0 § H).
 *   Never the auth token (Android Keystore), passwords, payment data, other users' data.
 */
export interface SchemaVersion {
  version: number;
  description: string;
  statements: readonly string[];
}

export const SCHEMA: readonly SchemaVersion[] = [
  {
    version: 1,
    description: 'local_user + app_settings',
    statements: [
      // The logged-in user, copied from the API's UserResource. At most ONE row: `slot` can only
      // be 1, so the database itself refuses a second user. Used to pick the home screen and show
      // the name when offline; it never grants access (Laravel checks the token on every call).
      `CREATE TABLE local_user (
        slot INTEGER PRIMARY KEY CHECK (slot = 1),
        user_id INTEGER NOT NULL CHECK (user_id > 0),
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('passenger', 'driver')),
        account_status TEXT NOT NULL CHECK (account_status IN ('active', 'suspended')),
        last_synced_at TEXT NOT NULL
      )`,
      // Device preferences as key/value text (e.g. onboarding_seen = '1').
      `CREATE TABLE app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
    ],
  },
];
