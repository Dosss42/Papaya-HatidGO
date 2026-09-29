# Phase 4 — Laravel API + MySQL (Foundation)

> **Status:** ✅ Complete (2026-09-29). Sections 1–8 are the plan; § 9 is the normalization record; § 10 is the report.
> **Goal:** Create the Laravel backend, connect it to MySQL, and build the **database from the ERD** (phase-0 § C, including the changes from the design briefs), with realistic **seed data**.
> **Done when:** `php artisan migrate:fresh --seed` builds every MVP table in MySQL without errors, the tables and relationships are visible in phpMyAdmin, and `GET /api/v1/health` answers from the browser.
> **Not in this phase:** login/register endpoints (Phase 5), business logic (Phases 7–9).

---

## 1. Environment (checked on this PC)

| Tool | Version | Notes |
|---|---|---|
| PHP | 8.5.6 (`C:\php 8.5.6`) | Laravel 13.10 needs PHP ^8.3 ✅. The required extensions are enabled (openssl, pdo_mysql, mbstring, fileinfo, curl, zip, bcmath, ctype, dom, xml, tokenizer). |
| Composer | 2.10.0 | PHP's package manager (the equivalent of npm) |
| Laravel | 13.10 (latest stable) | Installed per project by Composer |
| **MySQL** | **8.4.7, from WAMP**, port **3306** | **Chosen.** Real MySQL, as the brief specifies. WAMP's MariaDB (port 3307) and XAMPP's MariaDB 10.4 (end-of-life) are not used. |
| phpMyAdmin | from WAMP | To view tables and data |

**Only one database server at a time.** Never start XAMPP's MySQL while WAMP's MySQL runs; both use port 3306.

## 2. Where the backend lives

```text
Papaya HatidGO/
├── papaya-hatid-go/        ← mobile app (existing repo; the docs/ folder stays the project's documentation hub)
└── papaya-hatidgo-api/     ← NEW: Laravel backend, its own Git repo + GitHub repository
```

Separate repos keep each project's dependencies (`node_modules` vs `vendor`), `.gitignore`, and history clean.

## 3. MySQL vs SQLite (clearing up a common confusion)

| Database | Where | Role |
|---|---|---|
| **MySQL** | Laravel backend (this phase) | Central **source of truth** for all users, rides, payments… |
| **SQLite** | On the phone (Phase 6) | Small local cache, settings, retry queue |

New Laravel projects default to **SQLite** (`DB_CONNECTION=sqlite` in `.env`). This phase switches the backend to **MySQL**.

## 4. Database conventions

| Convention | Choice | Why |
|---|---|---|
| Charset | `utf8mb4` / `utf8mb4_unicode_ci` | Full Unicode: Filipino names with ñ, emoji in notes |
| Money | `decimal(10,2)` | Never float (rounding errors) |
| Coordinates | `decimal(10,7)` | ~1 cm precision |
| Time | Stored in **UTC** (Laravel default); shown in Asia/Manila in the apps | One unambiguous time in the database |
| Status fields | MySQL `enum` columns + **PHP backed enums** in the models | The database rejects invalid values, and PHP code gets type safety |
| Foreign keys | `foreignId()->constrained()` with explicit `onDelete` rules | Referential integrity enforced by MySQL |
| Deletes | No cascading deletes on rides, payments, reviews, or audit data | History must never disappear by accident |

## 5. Tables to create (MVP)

Created in **dependency order**: a table must exist before another table can reference it with a foreign key.

| # | Table | Depends on | Notes |
|---|---|---|---|
| 1 | `users` (modify Laravel's default) | — | + `phone` UQ, `role`, `account_status` |
| 2 | `personal_access_tokens` | users | From Sanctum (`install:api`) |
| 3 | `passengers` | users | 1:1 |
| 4 | `drivers` | users | 1:1; compliance, online, current location |
| 5 | `vehicles` | drivers | |
| 6 | `driver_requirements` | — | Admin-configured list |
| 7 | `driver_documents` | drivers, driver_requirements, vehicles, users (reviewer) | No file columns (see #8) |
| 8 | `driver_document_files` | driver_documents | 1–2 files (front/back): driver-requirements brief |
| 9 | `driver_requirement_reviews` | driver_documents, users | Review history |
| 10 | `fare_settings` | users | Versioned, insert-only |
| 11 | `system_settings` | users | Key/value (ride types on/off, radius, timeouts, service area, grace days) |
| 12 | `ride_requests` | passengers, drivers, vehicles, fare_settings | Incl. `ride_type`, `current_leg`, `wait_minutes`, two-way timestamps |
| 13 | `ride_offers` | ride_requests, drivers | UQ(ride, driver) |
| 14 | `ride_locations` | ride_requests | |
| 15 | `ratings` | ride_requests (UQ), passengers, drivers | score 1–5 (CHECK constraint) |
| 16 | `subscription_plans` | — | `duration_months` (1/6/12), `user_type` |
| 17 | `subscriptions` | users, subscription_plans | One row per paid period |
| 18 | `subscription_transactions` | subscriptions, users | `provider_checkout_id` UQ |
| 19 | `payment_events` | — | `provider_event_id` UQ, for webhook idempotency |
| 20 | `notifications` | (polymorphic) | Laravel's built-in table |
| 21 | `device_tokens` | users | FCM (used in Phase 13) |
| 22 | `audit_logs` | users | Append-only |

Laravel's own default tables (`password_reset_tokens`, `sessions`, `cache`, `jobs`) are kept. Password reset uses the first one in Phase 5.

**Later phases:** `complaints`, `support_tickets`, `messages`.

## 6. Seed data (sample values, clearly not official)

| Seeder | Content |
|---|---|
| `SystemSettingsSeeder` | `ride.one_way_enabled=1`, `ride.two_way_enabled=1`, `matching.radius_km=3`, `matching.max_offers=5`, `matching.request_timeout_seconds=120`, `matching.stale_online_minutes=3`, `subscription.grace_days=0`, service area center + radius (**placeholder**: exact town still an open decision) |
| `FareSettingsSeeder` | Base ₱30, ₱10/km, minimum ₱30, return multiplier 1.00, waiting ₱0, service fee ₱0 (**sample values**) |
| `SubscriptionPlanSeeder` | Passenger + driver plans: 1 / 6 / 12 months ("months free" pricing; **sample prices**) |
| `DriverRequirementSeeder` | Driver's license (front + back), OR/CR, franchise/MTOP permit, barangay/police/NBI clearance: all required, expiring, critical |
| `UserSeeder` (development only) | 1 admin, 2 sample passengers, 2 sample drivers (1 verified with a vehicle, 1 pending), using `@example.test` emails and password `password` |

The sample accounts are **for local development only** and must never be seeded in production.

## 7. Implementation steps

| Step | Task | Main command(s) |
|---|---|---|
| 4.1 | Start WAMP MySQL; create database `papaya_hatidgo` (utf8mb4) | WAMP tray → phpMyAdmin |
| 4.2 | Create the Laravel project | `composer create-project laravel/laravel papaya-hatidgo-api` |
| 4.3 | Git + GitHub repo for the backend | `git init` … |
| 4.4 | Switch `.env` from SQLite to MySQL; test the connection | `php artisan migrate:status` |
| 4.5 | API routes + Sanctum | `php artisan install:api` |
| 4.6 | Migrations for tables 3–22 (explained in groups) | `php artisan make:migration …` |
| 4.7 | PHP enums + Eloquent models with relationships | `php artisan make:model …` |
| 4.8 | Seeders | `php artisan make:seeder …` |
| 4.9 | Build and verify the database | `php artisan migrate:fresh --seed` → phpMyAdmin |
| 4.10 | Health endpoint `GET /api/v1/health` | `php artisan serve` → browser |
| 4.11 | Report + commit | — |

## 8. Test plan

| # | Test | Expected |
|---|---|---|
| T1 | `php artisan migrate:status` after switching `.env` | Connects to MySQL (no "could not find driver" or "Access denied") |
| T2 | `php artisan migrate:fresh --seed` | All migrations and seeders succeed |
| T3 | phpMyAdmin → `papaya_hatidgo` | All tables present; the Designer view shows the foreign-key relationships |
| T4 | Insert a rating with `score = 7` | Rejected by the CHECK constraint |
| T5 | Insert a second `payment_events` row with the same `provider_event_id` | Rejected by the UNIQUE constraint (idempotency proof) |
| T6 | `php artisan tinker` → `User::first()->driver->vehicles` | Relationships return data |
| T7 | Browser: `http://127.0.0.1:8000/api/v1/health` | `{"status":"ok","app":"Papaya HatidGo API","db":"connected"}` |

---

## 9. Normalization record (Step 4.6, as built)

The migrations are the **authoritative schema**. Where they differ from phase-0 § C, the decisions below explain why. Every rule marked *DB* was proven with an integrity test (inserts that must fail do fail, inside rolled-back transactions).

### 9.1 Changes from the phase-0 ERD

| # | Change | Normal-form reason |
|---|---|---|
| N1 | `users.name` → `first_name` + `last_name` | 1NF: atomic values (the apps address people by first name) |
| N2 | Suspension only in `users.account_status`; removed from `drivers.compliance_status` | One fact, one place |
| N3 | Removed `drivers.license_number` (it's the license document's `document_number`) | No redundancy (update anomaly) |
| N4 | `vehicles.is_primary` → `drivers.active_vehicle_id`, a **composite FK** to `vehicles(id, driver_id)` | *DB:* one active vehicle, and it must be the driver's own |
| N5 | Removed `driver_documents.reviewed_at / reviewed_by` | The review history table is the single record |
| N6 | Removed `driver_requirements.accepted_file_types` (a list in a cell); added `max_files` | 1NF; the shared upload rules live once in config |
| N7 | Vehicle document → composite FK `(vehicle_id, driver_id)` | *DB:* only your own tricycle's documents |
| N8 | Generated `current_key` + UNIQUE | *DB:* one current document per driver + requirement + vehicle |
| N9 | CHECKs on reviews | *DB:* reject needs a reason; only the system acts without a reviewer |
| N10 | Removed `fare_settings.is_active` | Derived from `effective_from` |
| N11 | `ratings` stores only `ride_request_id` | 3NF: passenger/driver come through the ride |
| N12 | No `accepted` offer status | The winner is recorded once: `ride_requests.driver_id` |
| N13 | No `waiting_minutes` column | Derived from two timestamps |
| N14 | No `reference_no` column | Derived from `id` (formatted in API responses) |
| N15 | `final_total` = **generated column** | Derived, but MySQL computes it, so it can't disagree |
| N16 | Generated `active_passenger_key` / `active_driver_key` + UNIQUE | *DB:* one active ride per passenger and per driver |
| N17 | 7 CHECKs on `ride_requests` | *DB:* status stays consistent with driver, timestamps, ride type |
| N18 | `subscriptions.status` → `state` (pending/paid/cancelled/suspended); active/past_due/expired **computed** | Time-derived values go stale at midnight |
| N19 | Removed `subscription_transactions.user_id` | 3NF: known through the subscription |
| N20 | Generated `paid_key` + UNIQUE | *DB:* a subscription is paid at most once |
| N21 | CHECKs on subscriptions/transactions | *DB:* a paid subscription has a valid period; paid ⇔ paid_at |
| — | Deferred: `passengers.emergency_contact_*` | Added with the SOS feature, not before |

### 9.2 Deliberate, documented exceptions

| Kept | Why it's acceptable |
|---|---|
| `drivers.compliance_status` (derived from documents) | Read by matching on every request; only `DriverComplianceService` writes it |
| `ride_requests.status` (partly derivable from timestamps) | Needed by the state machine and queries; N17 CHECKs prevent contradictions |
| `ride_requests.estimated_total`, `subscriptions.amount`, `subscription_transactions.amount` | Historical facts (what was shown / charged / reported by the gateway), not copies |
| `system_settings` key/value | Configuration, not business data; typed via a `type` column |
| `notifications` (Laravel built-in, polymorphic), `audit_logs` (polymorphic + JSON snapshots), `payment_events.payload` (JSON) | Framework convention / immutable history, never joined relationally |

### 9.3 Rules enforced in services (the database cannot express them)

| Rule | Where |
|---|---|
| Driver requirement → `vehicle_id` NULL; vehicle requirement → `vehicle_id` set | `DriverComplianceService` (depends on another table's `applies_to`) |
| A subscription's plan audience matches the user's role | `SubscriptionService` |
| Subscription periods of one user don't overlap | `SubscriptionService` (inside a DB transaction with a lock) |
| Allowed ride status transitions (phase-0 § E.3) | `RideService` |

### 9.4 Environment finding: WAMP defaults

| Finding | Risk | Fix |
|---|---|---|
| WAMP MySQL `default_storage_engine=MYISAM` | MyISAM **silently ignores foreign keys** and has no transactions | `config/database.php` → `'engine' => 'InnoDB'` (project-level, so it works on any machine) |
| WAMP MySQL time zone = the PC's zone (UTC+8), Laravel = UTC | DB-filled times (`useCurrent()` defaults, `NOW()`) were 8 hours "ahead": a new fare looked not-yet-effective, and ride expiry and subscription periods would have shifted. Found by model test 10. | `config/database.php` → `'timezone' => '+00:00'` (Laravel sets UTC on every connection) |
| WAMP MySQL `sql_mode` is empty (non-strict) | Direct inserts (phpMyAdmin/CLI) silently turn invalid enum values into `''` | Laravel sets strict mode on its own connections. Rule: change data only via Laravel (seeders, tinker, API). |

### 9.5 Result

**30 tables, all InnoDB · 25 foreign keys · 18 CHECK constraints · 5 generated-column rules**, verified with 34 integrity tests (A: 4 · B: 8 · C: 14 · D: 8).

---

## 10. Report

### 10.1 What was built (repo `papaya-hatidgo-api`)

| Area | Files |
|---|---|
| Project | Laravel **13.33.0** on PHP 8.5.6, MySQL 8.4.7 (WAMP, port 3306), database `papaya_hatidgo` (utf8mb4) |
| Config | `.env` → MySQL; `config/database.php` → `engine = InnoDB`, `timezone = +00:00`; PHP `intl` enabled |
| Auth base | `php artisan install:api`: Sanctum + `routes/api.php`; `HasApiTokens` on `User` |
| Migrations | 24 (Laravel's defaults + Sanctum + notifications + 18 of ours): **30 tables** |
| Enums | 17 PHP backed enums in `app/Enums/` (mirror the enum columns; `EffectiveSubscriptionStatus` is computed-only) |
| Models | 20 Eloquent models: relationships, enum casts, mass-assignment protection, derived accessors |
| App-wide | `AppServiceProvider`: enforced morph map; `Model::shouldBeStrict()` outside production |
| Seeders | 4 configuration seeders (idempotent) + `DevelopmentSeeder` (local/testing only) |
| API | `GET /api/v1/health` (`Api\V1\HealthController`) in the `/api/v1` route group |

### 10.2 Test results

| # | Test | Result |
|---|---|---|
| T1 | Laravel connects to MySQL | ✅ `db:show` → MySQL 8.4.7 / `papaya_hatidgo` |
| T2 | `migrate:fresh --seed` | ✅ all migrations + 5 seeders |
| T3 | Tables and relationships visible in phpMyAdmin | ✅ 30 tables, 25 FKs, seed data (student's phpMyAdmin export) |
| T4 | Rating 7 rejected | ✅ `chk_rating_score` |
| T5 | Duplicate webhook event rejected | ✅ unique (provider, provider_event_id) |
| T6 | Relationships return data | ✅ 15 model checks (incl. rating → driver THROUGH the ride, computed subscription status) |
| T7 | `GET /api/v1/health` | ✅ `200 {"status":"ok",…,"db":"connected"}` |
| + | Database integrity tests | ✅ 34/34 (A 4 · B 8 · C 14 · D 8), all in rolled-back transactions |
| + | Configuration seeders re-run | ✅ no duplicates (11 settings / 1 fare / 6 plans / 4 requirements) |

### 10.3 Problems encountered and fixes

| # | Problem | Layer | Cause | Fix |
|---|---|---|---|---|
| 1 | `localhost/phpmyadmin` → Not Found | WAMP config | WAMP registers phpMyAdmin with its version: `/phpmyadmin5.2.3` | Use that URL (or the WAMP tray menu) |
| 2 | `db:show` counted 25 tables in an empty database | Understanding | It listed other schemas (`wordpress`, `vanorant`) visible to `root` | None needed |
| 3 | `intl` extension required | PHP config | `;extension=intl` commented in `php.ini` | Enabled it (also needed for ₱ formatting) |
| 4 | `Specified key was too long; max key length is 1000 bytes` | Database engine | WAMP `default_storage_engine=MYISAM`; MyISAM also **ignores foreign keys** | `engine => 'InnoDB'` in `config/database.php` |
| 5 | Invalid enum value accepted via the mysql CLI | Database mode | WAMP `sql_mode` is non-strict | Laravel's connection is strict; data changes only via Laravel |
| 6 | New fare "not effective" in `FareSetting::current()` | Time zones | MySQL used the PC's UTC+8, Laravel uses UTC | `timezone => '+00:00'` in `config/database.php` |
| 7 | `·` shown as `�`; timestamps shown 8 h ahead in the CLI | Display only | The Windows CLI uses the cp850 charset; `TIMESTAMP` is displayed in the session's zone | Verified the stored bytes (`HEX`) and UTC values; no change |
| 8 | phpMyAdmin export lost **all 18 CHECK constraints** and `ENGINE=InnoDB` on 8 tables | Tooling | phpMyAdmin's SQL export omits CHECK constraints | Never restore from phpMyAdmin exports. Rebuild with migrations; back up with `mysqldump` (verified: keeps all 18). Don't commit dumps (they contain password hashes). |
| 9 | Config edits not applied (twice) | Tooling | A file was edited in the IDE between read and write, and the `mysql`/`mariadb` config blocks are identical | Re-read and targeted the exact block |

### 10.4 Before any real deployment (checklist)

- `APP_ENV=production`, **`APP_DEBUG=false`** (debug mode exposes stack traces and file paths)
- A dedicated MySQL user with a strong password (not `root` without a password)
- `DevelopmentSeeder` never runs (guarded in `DatabaseSeeder` by environment)
- MySQL server `sql_mode` strict (recommended), InnoDB default

### 10.5 Commands to recreate the database

```powershell
cd "C:\Users\ron28\Desktop\Papaya HatidGO\papaya-hatidgo-api"
php artisan migrate:fresh --seed     # drops everything, rebuilds 30 tables, seeds config + dev accounts
php artisan serve                    # http://127.0.0.1:8000/api/v1/health
```
