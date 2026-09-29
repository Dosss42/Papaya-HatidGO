# Phase 6 — SQLite (local storage on the phone)

**Goal:** the phone remembers the logged-in user and the device settings in a local SQLite database, so the app opens the right home screen immediately, even with no signal.
**Done when (phase-0 § M):** `local_user` and `app_settings` CRUD tested on the device.
**Rules come from:** [phase-0-analysis.md § H](phase-0-analysis.md#h-sqlite-strategy).

## 1. What problem this solves

Right now (end of Phase 5), `AuthService.restoreSession()` at startup does this:

| Situation at startup | Today | After Phase 6 |
|---|---|---|
| No saved token | Get Started | Get Started (first time) · **Login** (this phone has been used before) |
| Token + internet | `/auth/me` → home of the role | Same, and the local copy is refreshed |
| Token + server says 401 | Token deleted → Get Started | Token **and local user** deleted → Login |
| Token + **no internet** | ⚠️ Guest screens, although the user is logged in | **Home of the right role** from the local copy, with the notice "Walang internet · huling update 2:15 PM" |

## 2. The rule for what goes into SQLite

Data goes into SQLite only if all three are true: it is **useful offline or at startup**, it is **safe if it's a bit old**, and it is **not sensitive**.

| Local table (this phase) | Columns | Why |
|---|---|---|
| `local_user` | id, first_name, last_name, email, phone, role, account_status, last_synced_at | Right home screen at once; name shown offline; refreshed from `/auth/me` |
| `app_settings` | key, value, updated_at | Device preferences: `onboarding_seen`, later `last_map_center`, notification preferences |
| `schema_version` | version, applied_at | Knows which upgrade steps have already run |

**Never in SQLite:** the auth token (it stays in the Android Keystore), passwords, payment data, other people's data, live locations.
**Later phases add** `cached_rides` (Phase 10/11), `cached_status` (Phases 7–8) and `pending_sync` (Phase 10) as new schema versions. They aren't built now because their data doesn't exist yet.

**The local copy never grants access.** It only decides which screen to *show*. Every real action still goes to Laravel with the token, and Laravel decides.

## 3. How the code is organized

| Piece | Responsibility |
|---|---|
| `@capacitor-community/sqlite` 8.1.1 | The native SQLite plugin (Android) |
| `core/database/sqlite.service.ts` | **The only file that touches the plugin**: open the database `papaya_hatidgo`, run the versioned upgrades, `run` / `query` helpers |
| `core/database/schema.ts` | The upgrade list: version 1 = `local_user` + `app_settings`. A later phase adds version 2, 3, … and never edits an old version |
| `core/database/local-user.repository.ts` | `save(user)`, `get()`, `clear()` |
| `core/database/app-settings.repository.ts` | `get(key)`, `set(key, value)`, `remove(key)` |
| `core/services/auth.service.ts` | Saves the local user on login / register / `/me`; clears it on logout and 401; uses it when offline at startup |
| Passenger and driver home | Shows the offline notice with the last update time |
| Diagnostics (dev) | New "SQLite" card: schema version, row counts, and a **CRUD test** button (create → read → update → delete on a test row) |

Everything goes through **repositories**, not raw SQL in pages. So if the storage changes later, only the repository changes. This is the same idea as `TokenStorageService` in Phase 5.

## 4. Decisions (confirmed 2026-09-29)

| # | Question | Recommendation | Why |
|---|---|---|---|
| 1 | In the **browser** (`ionic serve`), SQLite needs extra setup (a WebAssembly build of SQLite). Do we set that up? | ✅ **No.** On Android the real SQLite is used; in the browser the same repositories keep data in memory only (lost on reload). | The product is an Android app (PRODUCT.md). The browser is only for quick layout checks. It saves a web component plus a WASM file that would only matter for development. |
| 2 | Encrypt the SQLite file (SQLCipher)? | ✅ **No, for now.** | The file holds no token and no passwords, only the user's own name, phone and email. It lives in the app's private storage, and `allowBackup=false` already keeps it out of backups. Encryption adds a key to manage. We can revisit it in Phase 15 (security review). |
| 3 | After the first use on a phone, should a logged-out user land on **Login** instead of Get Started? | ✅ **Yes** (`onboarding_seen` in `app_settings`). | Get Started is for new people. A returning driver who logs out wants to log in again in one tap. Login still has "Wala pang account? Gumawa". |

## 5. Implementation steps

| Step | Part | Task |
|---|---|---|
| 6.1 | Setup | Install the plugin · `cap sync` · check the Android build |
| 6.2 | Core | `SQLiteService` + `schema.ts` (version 1) + the memory fallback for the browser |
| 6.3 | Core | `LocalUserRepository` + `AppSettingsRepository` |
| 6.4 | Auth | AuthService uses the local user (save / clear / offline start) · offline notice on both home screens |
| 6.5 | Auth | `onboarding_seen` → returning guests start at Login |
| 6.6 | Dev | Diagnostics "SQLite" card with the CRUD test |
| 6.7 | All | Device tests + report + commit |

## 6. Test plan (on the Redmi)

| # | Test | Expected |
|---|---|---|
| S1 | Diagnostics → SQLite → CRUD test | Create ✅ read ✅ update ✅ delete ✅; schema version 1 |
| S2 | Log in as Maria → Diagnostics | `local_user` has 1 row (Maria, passenger); no token column anywhere |
| S3 | Stop `php artisan serve` (or unplug USB) → kill and reopen the app | Opens **passenger home**, with "Walang internet · huling update …" |
| S4 | Start the server again → pull to refresh / reopen | Notice disappears; `last_synced_at` updated |
| S5 | Log out | `local_user` empty; the app shows **Login** (not Get Started) |
| S6 | Log in, then revoke the token (log out from another device, or delete it in the database) → reopen | 401 → local user deleted → Login |
| S7 | Install the APK again (`adb install -r`) | Data kept; the upgrade does **not** run twice (schema version still 1) |
| S8 | Clear the app's storage in Android settings | Fresh start: Get Started, schema version 1 created again |

---

## 7. Report (Phase 6 complete, 2026-09-29)

| Step | Result |
|---|---|
| 6.1 | ✅ `@capacitor-community/sqlite` 8.1.1 installed · `cap sync` finds 6 plugins · Android build OK (APK ≈ 17 MB: the plugin bundles its own SQLite engine per CPU type) |
| 6.2 | ✅ `core/database/schema.ts` (version 1: `local_user` with a one-row `slot` CHECK, `app_settings`) · `core/database/sqlite.service.ts` (the only file that touches the plugin: open once, versioned upgrade, one transaction per version, `?` parameters only) · `androidIsEncryption: false` in `capacitor.config.ts` · unit test `schema.spec.ts`: **3 passing** (versions 1…n with no gaps, no token/password/secret columns) |
| 6.3 | ✅ `LocalUserRepository` (`save` · `get` · `clear`; `full_name` rebuilt, not stored; admin refused) and `AppSettingsRepository` (`get` · `set` · `remove` · `getFlag` / `setFlag`; typed `SettingKey`), each an abstract class with a **SQLite** version (Android) and a **memory** version (browser), chosen by Angular's `useFactory` · **13 unit tests passing** (behavior of the memory versions, `?` parameters and row → User mapping of the SQLite versions against a fake database, Angular gives the memory version outside Android) |
| 6.4 | ✅ **AuthService** saves the local user on login / register / `/me` and clears it on logout / 401 · offline start opens the right home from the saved copy (`isOffline`, `lastSynced` signals) · `refreshSession()` · startup `/me` wait 6 s (was 15 s) · `OfflineNoticeComponent` ("Walang internet · Huling update 2:28 PM" + "Subukan ulit") on both home placeholders, with "Kumusta, Maria!" · auto-retry in `AppComponent` when the phone is online and the app in front · **Emulator:** login → home, no notice ✅ · API cut → restart → Maria's home + notice in < 4 s ✅ · reconnect → Subukan ulit → notice gone ✅ · **31 / 31 unit tests** (5 older page tests fixed, see #5) · **Redmi (S3/S4):** API stopped → reopen → Maria's home + notice ✅ · API started → Subukan ulit → notice gone ✅ |
| 6.5 | ✅ `onboarding_seen` set on every successful login / register **and** when a saved token is restored (covers phones logged in before this change) · `AuthService.guestStartUrl()` (Get Started first time, Login after) used by the app start route, the `/auth` route, `roleGuard` and both Logout buttons · **Emulator:** logout → Login ✅ · restart logged out → Login ✅ · app storage cleared → Get Started ✅ |
| 6.6 | ✅ Diagnostics "SQLite (Phase 6)" card: storage, schema version + when it was applied, `local_user`, `app_settings`, **Run CRUD test** (`sqlite-check.ts`: create → read → update → delete through the real `AppSettingsRepository` with the key `diag_test` and a unique value, always removed at the end; `local_user` is not written by the test so the real login is never overwritten, its CRUD is shown by login / `/me` / logout) · dev-only Diagnostics link added to both Account pages (logged-in users could not reach it) · **33 / 33 unit tests** · **Emulator:** schema 1 ✅ · CRUD **PASS 4/4** ✅ |
| 6.7 | ✅ **Redmi Note 13 Pro 5G:** S1 CRUD test PASS 4/4 · S2 `local_user` + `onboarding_seen = 1` after login · S3/S4 offline start + Subukan ulit · S5 logout → Login · S7 reinstall keeps schema 1 with the same "since" time · S8 Clear all data → Get Started, schema 1 with a new time (see #8) · report · commit |

### Problems found

| # | Problem | Cause | Fix |
|---|---|---|---|
| 1 | `npm audit`: 3 moderate (`uuid`) after installing | Not from SQLite: `@capacitor/cli` → `xcode` (iOS tool) → `uuid@7`; build-time only, the affected function is not used | Leave it; **never** `npm audit fix --force` (it would downgrade the Capacitor CLI). Goes away when Capacitor updates |
| 2 | The plugin's Android default is **encryption ON** | `SqliteConfig.isEncryption = true` in the plugin's Java code | Set `CapacitorSQLite.androidIsEncryption: false` explicitly, so decision #2 is written in config and not hidden in a default |
| 3 | An in-memory fallback cannot sit *under* SQL | The browser has no SQL engine (that was the WASM we chose not to add) | The fallback moves to the repositories (6.3): same methods, a SQLite version for Android and a memory version for the browser |
| 4 | 🔒 **The auth token appeared in the Android log** (`Capacitor/Console … {"data":"22\|rZvI…"}`), found while reading logcat in 6.4 | Capacitor's default `loggingBehavior: 'debug'` prints every plugin call **and its result** in debug builds, including SecureStorage's answer (release builds were not affected) | `loggingBehavior: 'none'` in `capacitor.config.ts`. Re-checked: 0 token lines, 0 "Bearer" lines in logcat. Debug with `chrome://inspect` instead |
| 5 | 5 old "should create" page tests failed (login, register, welcome, both tabs) | Already failing at the Phase 5 commit: the generated tests gave the pages no router and no HTTP client | Added `provideRouter([])`, `provideHttpClient()`, `provideHttpClientTesting()` to those tests → 31 / 31 |
| 6 | Weak signal at startup could mean up to 15 s of blank screen | `/me` used the normal 15 s timeout also at startup | Startup waits 6 s, then opens from the saved copy; "Subukan ulit" and the auto-retry use the full 15 s |
| 8 | S8: the schema "since" time did not change after clearing the app | "Clear cache" deletes temporary files only; the SQLite database is app **data** | Use **Clear data → Clear all data** (HyperOS: Settings → Apps → Manage apps → Papaya HatidGo). Then the time is new and Get Started is back |
| 7 | Script edits "found nothing to replace" in some files | Those files have Windows line endings (CRLF) after a `git stash` round trip | Match `\r?\n`, or edit with the editor |

### Done-when check (phase-0 § M)

✅ `local_user` and `app_settings` CRUD tested on the device: `app_settings` by the CRUD test (create · read · update · delete), `local_user` by real use (login creates, `/me` updates, logout deletes), both visible in Diagnostics.

### Files

**New:** `core/database/schema.ts` · `sqlite.service.ts` · `local-user.repository.ts` · `app-settings.repository.ts` (+ 3 spec files) · `shared/components/offline-notice/` · `features/dev/pages/diagnostics/sqlite-check.ts` (+ spec).
**Changed:** `auth.service.ts` (local user, offline start, `refreshSession`, `guestStartUrl`, startup timeout) · `app.component.ts` (auto-retry) · `app.routes.ts` + `auth.routes.ts` + `role-guard.ts` (guest start) · both home and account pages · diagnostics page · `capacitor.config.ts` (`androidIsEncryption: false`, `loggingBehavior: 'none'`) · 5 older page specs (test providers).
**Tests:** 33 / 33 unit tests (was 26 passing + 5 failing at the end of Phase 5).

### Carried to later phases

- `cached_status` (Phases 7–8), `cached_rides` and `pending_sync` (Phase 10) arrive as schema versions 2, 3, … appended to `schema.ts`.
- SQLCipher encryption: revisit in Phase 15 (security review).
- The home pages are still placeholders (Phases 10 and 11).
