# Phase 7 — Driver requirements + vehicles

**Goal:** a driver registers their tricycle and uploads their four documents from the phone; an admin reviews them; the driver always sees what's missing and what to do next.
**Done when (phase-0 § M):** upload → review → verified works; status rules tested.
**Rules come from:** [phase-0-analysis.md § D](phase-0-analysis.md#d-driver-requirements-workflow) (states, compliance, eligibility, admin review, file handling) · § G (API) · the confirmed brief [design-briefs/driver-requirements.md](design-briefs/driver-requirements.md) · [DESIGN.md](../DESIGN.md) (visual rules).

## 1. What already exists (Phase 4)

No new tables are needed. The database was designed for this in Phase 4:

| Table | Already enforces |
|---|---|
| `drivers` | `compliance_status` (written only by `DriverComplianceService`), `active_vehicle_id` → must be **this driver's own** vehicle (composite FK) |
| `vehicles` | Unique plate, unique body number, `status` |
| `driver_requirements` | The 4 seeded requirements (license 2 files; OR/CR, MTOP, clearance 1 file; all required, critical, with expiry) |
| `driver_documents` | **At most one current document** per driver + requirement + vehicle (generated `current_key` + UNIQUE); a vehicle document must point to the driver's own vehicle (composite FK) |
| `driver_document_files` | Front / back as separate files; private paths; deleted with their document |
| `driver_requirement_reviews` | Every approve / reject / resubmission / system expiry, with reviewer and reason |

## 2. How it works (the rules we're building)

**Upload → review → verified**

```text
Driver (phone)                          Laravel                               Admin (Postman now, web in Phase 14)
─────────────                           ───────                               ─────
Add tricycle ─────────────────────────► vehicle: pending
Upload license (front + back) ────────► document: pending (files on the PRIVATE disk)
   … all 4 uploaded ──────────────────► compliance: under_review
                                                                        ◄──── approve / reject (+ reason) / request fix
                                        review row + audit log + recalculate
Home checklist shows the result ◄────── compliance: verified (or rejected + reason)
```

**Compliance status** (phase-0 § D.2): recalculated by `DriverComplianceService` after **every** change (upload, review, vehicle edit, suspension, daily expiry). The first matching rule wins: suspended → expired → rejected → missing → under review → verified.

**Renewal without going offline** (brief § 5): a new upload for a document that is still approved and unexpired does **not** replace it until the new one is approved. Otherwise the new upload becomes current immediately.

**Files** (§ D.5): JPG / PNG / PDF, ≤ 5 MB each, 1–2 per document; MIME type checked by Laravel from the file's content (not its name); saved with random names on the **private** disk; the admin gets them only through an authorized endpoint that streams the file. Photos are compressed on the phone first (~1600 px, JPEG 80%) and are **never stored on the phone** (phase-0 § H).

## 3. Implementation steps

### Part A — API (`papaya-hatidgo-api`)

| Step | Task |
|---|---|
| 7.1 | `role:` middleware (driver-only / admin-only routes) · `DriverComplianceService`: `recalculate()` and `eligibility()` · **unit tests for every § D.2 rule** |
| 7.2 | Vehicles: `GET/POST /vehicles`, `PATCH /vehicles/{id}` (plate change → pending), first tricycle becomes `active_vehicle_id` |
| 7.3 | Requirements + documents: `GET /driver-requirements`, `GET /drivers/me/requirements` (each requirement + its current status), `POST /drivers/me/documents` (multipart, 1–2 files, private disk, the renewal rule), `GET /drivers/me/documents/{id}` (status + review history) |
| 7.4 | Admin review: `GET /admin/driver-verifications`, `GET /admin/driver-documents/{id}`, `GET …/file` (streams), `POST …/approve · reject · request-resubmission` (reason required), `POST /admin/drivers/{id}/suspend · reactivate` · each writes a review row + `audit_logs` row |
| 7.5 | Daily scheduler: approved documents past `expires_at` → `expired` (review row by the system) → recalculate |
| 7.6 | Feature tests: upload rules, file privacy (another driver / a passenger gets 403/404), renewal rule, review flow, expiry job |

### Part B — Mobile (`papaya-hatid-go`)

| Step | Task |
|---|---|
| 7.7 | `@capacitor/camera` · photo compression · `DriverService` / `VehicleService` / `DocumentService` (upload with progress) |
| 7.8 | 🎨 Screens from the brief, in the DESIGN.md look: **Driver Home checklist** (headline + ① tricycle ② documents ③ subscription 🔒 Phase 8 ④ go online 🔒 + one next-step button) · **Tricycle** form · **Requirements list** · **Requirement detail + upload** (photo guide, Harap/Likod slots, preview + Ulitin, expiry date picker, privacy line, Isumite + progress, history) |
| 7.9 | Finish review (impeccable) on the new screens |
| 7.10 | Device tests on the Redmi (camera, upload, Postman approvals) + report + commits |

**Not in Phase 7:** push notifications and the 30 / 7-day expiry reminders (Phase 13; the app already shows "Mag-e-expire" on its own) · the admin web screens (Phase 14; Postman until then) · going online (Phase 11) · subscriptions (Phase 8).

## 4. Decisions (confirmed 2026-09-29)

| # | Question | Recommendation | Why |
|---|---|---|---|
| 1 | How does a **tricycle** become verified? | ✅ **Automatically:** when its OR/CR and MTOP are both approved and unexpired. The admin can still mark it rejected / inactive by hand (e.g. the plate in the photo doesn't match). | The admin already checks the plate on the OR/CR and MTOP; a second "approve vehicle" click would repeat the same check. |
| 2 | How do we play "admin" until the admin web exists (Phase 14)? | ✅ **Postman** with the real admin API | Phase 0 planned this. Phase 14's web dashboard will call the exact same endpoints, so they're tested now. |
| 3 | How many tricycles per driver in the app? | ✅ **One** (the API allows more) | Every driver in the brief drives one tricycle. A "switch tricycle" screen can come later without changing the database. |

## 5. Test plan (summary)

| # | Test | Expected |
|---|---|---|
| R1 | A new driver opens Home | Headline "4 na lang…", next step "Idagdag ang tricycle mo" or "I-upload ang license" |
| R2 | Upload OR/CR before adding a tricycle | Locked: "Idagdag muna ang tricycle mo." |
| R3 | Upload a 10 MB photo | Compressed on the phone; accepted (< 5 MB) |
| R4 | Upload a `.exe` renamed `.jpg` (API test) | 422: the real file type is checked |
| R5 | Another driver / a passenger requests the file URL | 403 / 404; only the owner's status and the admin's stream work |
| R6 | All 4 uploaded | `under_review` · "Sinusuri ng admin…" |
| R7 | Admin rejects the clearance with a reason | `rejected` · the reason shows on Home and on the detail screen |
| R8 | Fix and re-upload → admin approves all | `verified` · tricycle verified |
| R9 | Renew an approved license before it expires | Stays `verified` while the new one is pending |
| R10 | Expiry job with a past `expires_at` | Document `expired` · compliance `expired` · review row "expired_by_system" |
| R11 | Change the plate of a verified tricycle | Warning first; after saving, tricycle `pending` → compliance recalculated |

---

## 6. Implementation log (becomes the report in 7.10)

| Step | Result |
|---|---|
| 7.1 | ✅ `role:` middleware (`EnsureRole`, alias in `bootstrap/app.php`; 403 `FORBIDDEN_ROLE` in the standard error format) · `DriverComplianceService`: `requirementStates()` (per requirement: current document, **effective** status (approved + past date = expired even before the daily job), pending renewal, locked tricycle papers), `recalculate()` (§ D.2 rules in order + automatic tricycle status + set offline when no longer verified), `eligibility()` (§ D.3 checklist with next actions) · **18 new tests (14 compliance + 4 role guard) → API 59 tests, 163 assertions, all passing** |
| 7.1b | ✅ **Design shell pass** (the student's request): every passenger and driver tab now has its DESIGN.md look (see § 7, "Design shell"). **35 / 35 unit tests** |
| 7.1c | ✅ **Language setting: English + Taglish** (the student's request): every screen and every API message in the chosen language, asked on first open, changeable in Account (see § 7, "7.1c"). **Mobile 41 / 41 unit tests · API 64 / 64 tests** |
| 7.2 | ✅ Tricycle API: `GET /vehicles` (own only) · `POST /vehicles` (first one becomes active) · `PATCH /vehicles/{id}` (another driver's = 404) · plates stored in one form (`PlateNumber`) · **a new plate voids the tricycle's OR/CR + MTOP with a reason** (new review action `invalidated_by_system`, migration `2026_10_01_100000`) · messages in both languages · **API 76 / 76 tests, 235 assertions** (12 new) |
| 7.3 | ✅ Requirements + documents API: `GET /driver-requirements` · `GET /drivers/me/requirements` (the checklist) · `POST /drivers/me/documents` (multipart, private disk, real content check, renewal rule, replace unreviewed) · `GET /drivers/me/documents/{id}` · private disk `serve` off · `uploads` rate limit · requirement names in both languages · **API 90 / 90 tests, 317 assertions** (14 new) |
| 7.4 | ✅ Admin review API (`role:admin`): review queue · document detail · **file streaming (the only door to a file, logged)** · approve (optional expiry correction) / reject / request resubmission (reason required) · suspend / reactivate · every action = review row + **audit log** + recalculate · Postman collection `papaya-hatidgo-api/postman/` · **API 103 / 103 tests, 441 assertions** (13 new) |
| 7.5 | ✅ Daily expiry job `php artisan documents:expire` (00:05 **Philippine** time) · **business timezone** (`Asia/Manila`) + `BusinessDate` for every date rule (timestamps stay UTC) · **API 108 / 108 tests, 469 assertions** (5 new). **Part A (API) complete** |

### Problems found

| # | Problem | Cause | Fix |
|---|---|---|---|
| 1 | phase-0 § D.2 lists `suspended` as a compliance status, but `drivers.compliance_status` has no such value | Phase 4 put suspension on `users.account_status` (one place for all roles) | `recalculate()` writes only the 5 document states; `eligibility()` reports suspension as its own `account_active` check |

---

## 7. Step notes (explained)

### 7.1 Role guard + the compliance "brain"

**1. Role guard: `app/Http/Middleware/EnsureRole.php`**

Adding `->middleware('role:driver')` to a route means only drivers get in. Anyone else gets **403** with `"Hindi para sa account mo ang bahaging ito."` (code `FORBIDDEN_ROLE`) in the standard error format. Several roles can be allowed: `role:driver,admin`.

This is the **real** security check. The mobile app's role guard only decides which screens to show; this one blocks the request on the server. It is registered once as the alias `role` in `bootstrap/app.php` and runs after `auth:sanctum`, so "no token" is still **401** and "wrong role" is **403**.

**2. The compliance "brain": `app/Services/DriverComplianceService.php`**

| Method | What it does |
|---|---|
| `requirementStates()` | For each of the 4 papers: which upload currently counts, its **real** status, a pending renewal (if any), and whether it is **locked** (OR/CR and MTOP need a tricycle first). Returned as `RequirementState` objects (`app/Services/RequirementState.php`) |
| `recalculate()` | Applies the phase-0 § D.2 rules in order (**expired → rejected → missing → under review → verified**; the first match wins), verifies the tricycle **automatically** when its OR/CR and MTOP are approved (decision #1), saves, and sets the driver **offline** if they are no longer verified |
| `eligibility()` | The go-online checklist: account active · documents verified · tricycle verified · subscription active. Each failed check carries the next action (`contact_admin`, `complete_requirements`, `add_vehicle` / `fix_vehicle`, `renew_subscription`) for the app to show |

Two details worth explaining in the defense:

- **"Effective" expiry.** A license approved last year with yesterday's expiry date counts as **expired immediately**, even before the daily job (7.5) marks it in the database. No driver stays "verified" for hours on an expired license.
- **Renewal without going offline.** A new upload waiting for review does not replace the approved one that still counts, so the driver stays verified while the admin reviews the new copy (brief § 5).

It is the **only** code that writes `drivers.compliance_status` and the tricycle's automatic status. Every other part (uploads, reviews, the daily job) calls `recalculate()` instead of setting a status itself, so the rule lives in one place.

**3. The 18 new tests** (`tests/Feature/Drivers/`, run on the MySQL test database `papaya_hatidgo_test`)

| Group | What they prove |
|---|---|
| Rules (9) | new driver = pending · all submitted = under review · all approved = verified **and** tricycle verified · rejected beats missing · "resubmit" counts as rejected · past date = expired · expired beats rejected · tricycle papers locked without a tricycle · an admin-rejected tricycle blocks verification and is not auto-overwritten |
| Renewal (1) | a pending renewal keeps the driver verified |
| Eligibility (4) | set offline when no longer verified · the checklist with its next action · eligible when verified + subscribed · suspended → the account check fails |
| Role guard (4) | the right role gets in · another role gets 403 · several roles can be allowed · no token = 401, not 403 |

Result: **59 API tests, 163 assertions, all passing** (41 from Phase 5 + 18 new).

**A mismatch resolved:** phase-0 § D.2 lists "suspended" as a compliance status, but the Phase 4 database keeps suspension on the **user** account (`users.account_status`, one place for every role). The service follows the database: suspension appears as its own "account active" check in `eligibility()` (problem #1 above).

**Nothing to test on the phone yet:** this step is server-side only. The phone starts using it in Part B (7.7+).

### 7.1b Design shell pass (requested by the student)

**Why:** after Phase 6 every tab except Account still showed Ionic's placeholder text ("passenger-book"), so the outcome of the design couldn't be judged. The student asked for a design on all tabs now.

**Decision (confirmed):** a *design shell*: every tab gets its real look now, but shows **only what is true today**. No fake data, because booking, rides and earnings depend on Phases 9–11; screens with sample numbers would have to be rebuilt, and fake numbers can be mistaken for real ones during testing.

| Tab | What it shows now | Becomes fully real in |
|---|---|---|
| **Tab bars** (both) | DESIGN.md style: 28px icons, 16px+ bold Taglish labels (Mag-book · Biyahe · Account / Home · Biyahe · Kita · Account), the authored tricycle icon on Mag-book. **Selected = orange label AND a 4px orange bar on top** (never color alone) | — (done) |
| **Account** (both) | **Real:** profile card (initials, name, role, phone written locally as 0917 000 0001, email) · settings rows (Tricycle ko, Mga dokumento, Subscription, Tulong) marked **"Darating"** and not tappable · **Mag-logout** (outline, with a confirm dialog) · Diagnostics (dev builds only) | Rows: 7.8 (tricycle, documents), Phase 8 (subscription) |
| **Biyahe** (both), **Kita** | Their **real empty state**: icon in a papaya-tint circle, "Wala ka pang biyahe" / "Wala ka pang kita", one line on what will appear | Phases 10 (passenger), 11 (driver) |
| **Mag-book** | **Preview** of booking step 1 from the booking brief: map area (plain grid, "Dito lalabas ang mapa."), "1 / 3", "Saan ka susunduin?", the Landmark field, notice "Preview pa lang ito. Hindi pa makakapag-book.", the disabled "Dito ako susunduin" | Phase 10 |
| **Driver Home** | **Preview** of the checklist from the requirements brief. The **headline and the next-step button are real**: they follow the driver's `compliance_status` from `/auth/me` (brief § 6), e.g. a verified driver sees "Verified ka na! Mag-subscribe para makapag-online." + [Mag-subscribe]. The four rows are marked "Darating" / "Naka-lock" | 7.8 (checklist), Phase 8, Phase 11 |

**Shared parts added** (reused by every screen, in `src/theme/world.scss`): `.hg-tabs` · `.hg-tab-page` (no toolbar; the heading lives in the page) · `.hg-tag` · `.hg-empty` · `.hg-profile` · `.hg-menu` · `.hg-map-placeholder` · `.hg-notice--info`. **Components:** `app-empty-state`, `app-profile-card`, `app-logout-button`. **Utility:** `formatPhoneLocal()` (+ test).

**Why these choices (for the defense):**
- **Logout asks first** ("Mag-logout?" · Huwag muna / Mag-logout): an older driver's thumb can hit it by accident, and logging back in costs a password. It is an **outline** button, because logging out is never the screen's main action (One Orange Rule).
- **"Darating" rows are visible but not tappable:** the driver learns what's coming without tapping into a dead end.
- **Previews say they're previews:** a disabled orange button with no explanation looks broken.

**Problems found while checking on the emulator**

| # | Problem | Fix |
|---|---|---|
| 1 | Book: the map area was so tall that "Dito ako susunduin" hid behind the tab bar | Map area 34vh → 26vh |
| 2 | Driver Home: a **verified** driver (Juan, from the dev seed) was told "Idagdag ang tricycle mo" | The button follows the same status as the headline (verified → Mag-subscribe, rejected → Ayusin ang dokumento, expired → I-upload ang bago, under review → no button) |
| 3 | The headline broke "Mag- / subscribe" at the hyphen (DESIGN.md forbids it) | Each headline word is kept whole (`hg-nowrap` per word) |
| 4 | The two Account page tests failed after adding a link | Test providers (router + HTTP), as in Phase 6 |

**Screenshots:** `.impeccable/review/shell-p-book.png`, `shell-p-rides.png`, `shell-p-account.png`, `shell-d-home.png`, `shell-d-earnings.png`, `shell-d-account.png`. The finish review (7.9) covers these screens together with the Phase 7 screens.

### 7.1c Language setting: English + Taglish (requested by the student)

**Request:** "Mag-subscribe" → **Subscribe**, "Mag-logout" → **Logout**, the logout alert in English, and English for passengers, or a setting to choose English, Taglish or Tagalog.

**Decisions (confirmed):**

| Question | Choice | Why |
|---|---|---|
| How to handle language | **A setting: English + Taglish** | Serves older drivers (Taglish) and passengers who prefer English; cheapest to add now, while only ~10 screens exist |
| Pure Tagalog as a third option? | **No** | Tech words (subscription, book, online) have no natural Tagalog form; formal Tagalog reads stiffer than how people text; a third copy of every text to keep in sync |
| Language of a new phone | **Ask on first open** | Nobody starts in a language they can't read |
| The 3 text changes | Buttons **Subscribe** and **Logout** in both languages; the logout alert follows the chosen language | A Taglish screen with one English alert would mix languages |

**How it works (mobile):**

| Piece | Role |
|---|---|
| `core/i18n/messages.en.ts` | Every text in English. This file **defines the keys** (`MessageKey`), e.g. `'logout.button'` |
| `core/i18n/messages.fil.ts` | Every text in Taglish, typed `Record<MessageKey, string>`: a missing or extra key is a **build error**, so no screen can be half-translated |
| `core/i18n/i18n.service.ts` | The current language (a signal), `t(key, params)` with `{name}` placeholders, `setLang()` saves to `app_settings.language` (SQLite, Phase 6) and sets `<html lang>` for screen readers; `load()` runs at startup **before** the session is restored, so the first screen and the first API call already use it |
| `core/i18n/t.pipe.ts` | `{{ 'login.title' \| t }}` in templates. Not pure, and it reads the language signal, so every screen changes **instantly**, with no restart |
| `auth-interceptor.ts` | Sends `Accept-Language: en` or `fil` to our API only |
| `form-errors.ts`, `api-error.ts` | The phone's own error messages now come from the dictionaries |
| Get Started | New phone: "Choose your language / Piliin ang wika" (written in both), two big cards **English · Taglish**, each named in itself. Afterwards: a quiet "Language: English" link to pick again |
| Account › **Language / Wika** | A real row (the first non-"Darating" setting), opens a picker with the current one marked ✓ |

**How it works (API):**

| Piece | Role |
|---|---|
| `app/Http/Middleware/SetLocaleFromRequest.php` | Reads `Accept-Language`; only `en` or `fil` are honored (e.g. `en-US,en;q=0.9` → en); anything else keeps the default `fil`. Prepended to the `api` group, so validation already uses it |
| `lang/en/api.php`, `lang/fil/api.php` | Error format, login, password reset and the reset **email** texts (they were hard-coded in PHP) |
| `lang/{en,fil}/validation.php` | `custom` (per-field lines, moved out of the four FormRequests' `messages()`) + `attributes` (field names). Laravel **merges** our file over its own English one, so standard rules stay in English automatically |

**Tests added:** mobile `i18n.service.spec.ts` (6: default Taglish, switch + save + `<html lang>`, restore at startup, placeholders, **same placeholders in both languages**, no empty text) · API `LanguageTest` (5: no header → Taglish, `en` → English, English validation with our field names, unsupported language → Taglish, **every key exists in both languages**).

**Problems found**

| # | Problem | Cause | Fix |
|---|---|---|---|
| 1 | After adding the middleware, every API test answered in **English** | Laravel's test client sends `Accept-Language: en-us` by default (Symfony `Request::create`) | The base `TestCase` sends an empty Accept-Language, like the app before a language is chosen; a test that wants English asks for it |
| 2 | The "same keys in both languages" test failed on `attribute-name` | It compared Laravel's *merged* files, which include a framework sample key | Compare our own two files directly |
| 3 | Build error: can't bind `showLabel` / `hideLabel` on `ion-input-password-toggle` | Ionic's Angular wrapper doesn't declare them as inputs | Bind the HTML attributes `[attr.show-label]` / `[attr.hide-label]`, which the web component reads |
| 4 | Long inline shell scripts failed ("unexpected EOF") | Quote characters inside the command | Edit scripts are written to a file first, then run with node |

**Not translated yet:** the GPS messages in `shared/models/location.model.ts` (only the dev Diagnostics page shows them today; they are translated in Phase 10, when booking shows them to users) and the dev-only Diagnostics page itself.

**Checked on the emulator:** first open → language picker ✅ · English → Get Started, Login, admin-blocked message, Account, logout alert ("Log out? … Cancel / Logout") all English ✅ · `app_settings.language = en` in Diagnostics ✅ · Account › Language → Taglish → every text, including the tab labels, switched at once ✅. Screenshots: `.impeccable/review/lang-*.png`.

### 7.2 Tricycle API

**Endpoints** (all behind `auth:sanctum` + `role:driver`):

| Method | Endpoint | What it does |
|---|---|---|
| GET | `/api/v1/vehicles` | The driver's **own** tricycles only |
| POST | `/api/v1/vehicles` | Register a tricycle: `plate_number`, `color` (required), `body_number`, `make`, `model` (optional). The first one becomes the driver's **active** tricycle (decision #3: one tricycle in the app; the API allows more) |
| PATCH | `/api/v1/vehicles/{id}` | Change only the fields sent. Another driver's tricycle answers **404**, not 403, so the API doesn't even confirm it exists |

Each answer is a `VehicleResource`: id, plate_number, body_number, make, model, color, status, `is_active` (derived from `drivers.active_vehicle_id`, not stored on the vehicle).

**Files:** `app/Support/PlateNumber.php` · `app/Http/Requests/Vehicles/{Store,Update}VehicleRequest.php` · `app/Services/VehicleService.php` · `app/Http/Resources/VehicleResource.php` · `app/Http/Controllers/Api/V1/VehicleController.php` · `routes/api.php` · migration `2026_10_01_100000_add_invalidated_by_system_to_driver_requirement_reviews.php` · `ReviewAction::InvalidatedBySystem` · new lines in `lang/{fil,en}/{api,validation}.php`.

**Rules worth explaining in the defense:**

- **One stored form for plates.** "abc 1234", "ABC-1234" and "ABC1234" are the same plate, so they are stored as `ABC1234` (uppercase letters and digits only). The UNIQUE index on `vehicles.plate_number` then really means "one tricycle per plate". Same idea as phone numbers in Phase 5 (`PhoneNumber`).
- **A new plate means new papers.** Decision #1 verifies a tricycle *automatically* when its OR/CR and MTOP are approved. If a plate change only reset the tricycle to "pending", the automatic rule would re-verify it a second later with papers showing the **old** plate. So `VehicleService::update()` also marks the tricycle's current OR/CR and MTOP **resubmission required** and records why: *"Nagbago ang plate number. I-upload ang OR/CR at MTOP na may bagong plate."* The driver's own papers (license, clearance) are untouched. Color, body number, make and model changes need no re-review. Typing the **same** plate differently ("abc-1234") is not a change.
- **Every change ends with `DriverComplianceService::recalculate()`**, so the driver's status and the tricycle's automatic status are always derived in one place (7.1).
- **A suspended driver** can still see their status but can't add or change a tricycle (403 `ACCOUNT_SUSPENDED`).

**The database rule that had to be extended (not weakened).** Phase 4 put two MySQL CHECK constraints on `driver_requirement_reviews`: *a rejection or "please resubmit" needs a reason* (`chk_review_reason`), and *only the system may act without a reviewer, and the system only expires documents* (`chk_review_actor`). The plate-change entry is a system action that isn't an expiry, so MySQL would have refused it. A **new migration** (the original is never edited) adds the system action `invalidated_by_system` and widens `chk_review_actor` to name both system actions. `chk_review_reason` still applies: an invalidation must say why. A test proves MySQL **still refuses** a rejection without an admin and an invalidation without a reason.

**Tests** (`tests/Feature/Drivers/VehicleTest.php`, 12):

| Test | Expected |
|---|---|
| Register a tricycle | 201 · plate `ABC1234` · body number `T-12` · pending · active · driver still pending_verification |
| A second tricycle | Allowed, not active |
| Same plate typed differently | 422 "May nakarehistro nang tricycle na may plate number na ito." |
| Missing plate/color, bad plate format | 422 on both fields |
| A passenger calls the endpoints | 403 `FORBIDDEN_ROLE` |
| List | Only the driver's own tricycles |
| Edit another driver's tricycle | 404, nothing changed |
| Change only the color of a verified tricycle | Stays verified, driver stays verified |
| "Change" to the same plate typed differently | Not a change, stays verified |
| **New plate on a verified tricycle** | Tricycle pending · OR/CR + MTOP resubmission required · review row `invalidated_by_system`, no reviewer, with the reason · license + clearance still approved · driver **rejected** (needs fixing) |
| Database rule check | MySQL refuses a reviewer-less rejection (`chk_review_actor`) and a reason-less invalidation (`chk_review_reason`) |
| Suspended driver | 403 `ACCOUNT_SUSPENDED` |

**Problems found**

| # | Problem | Cause | Fix |
|---|---|---|---|
| 1 | The test run hung for 17 minutes, then 62 tests failed with "target machine actively refused it" | WAMP's MySQL was not running (the laptop had restarted) | Start WampServer and wait for the **green** tray icon; then 76 / 76. Lesson: "connection refused" on port 3306 = MySQL is off, not a code bug |
| 2 | The plate-change review entry would be refused by MySQL | Phase 4's `chk_review_actor` allowed only automatic expiry without a reviewer | New migration with the system action `invalidated_by_system` (see above); the student ran `php artisan migrate` on the development database |

**Nothing to test on the phone yet:** the tricycle screen uses these endpoints in 7.8.

### 7.3 Requirements + document uploads

**Endpoints** (all behind `auth:sanctum` + `role:driver`):

| Method | Endpoint | What it does |
|---|---|---|
| GET | `/api/v1/driver-requirements` | The active requirement definitions, **named in the request's language** |
| GET | `/api/v1/drivers/me/requirements` | **The checklist** behind Driver Home and the requirements list: `compliance_status` + one row per requirement: `status` (missing / pending / approved / rejected / resubmission_required / expired, the *effective* status), `locked`, the current `document` (expiry, `days_until_expiry` for "Mag-e-expire sa {n} araw", the admin's `reason` when something must be fixed) and a pending `renewal` |
| POST | `/api/v1/drivers/me/documents` | **Upload** one requirement, `multipart/form-data`: `requirement_id`, `files[]`, `sides[]` (front / back), `expires_at` (required when the requirement expires, not in the past), `document_number`, `issued_at`. Rate-limited: 10 uploads per 10 minutes per driver |
| GET | `/api/v1/drivers/me/documents/{id}` | One submission: status, details, file **metadata** and the review history (decision + reason, not which admin). Another driver's document = **404** |

**Files:** `app/Services/DocumentService.php` · `app/Http/Requests/Documents/StoreDocumentRequest.php` · `app/Http/Resources/{Requirement,RequirementState,DriverDocument}Resource.php` · `app/Http/Controllers/Api/V1/{DriverRequirement,DriverDocument}Controller.php` · `DriverRequirement::displayName()/displayDescription()` · `lang/{fil,en}/requirements.php` (new) + new lines in `api.php` / `validation.php` · `config/filesystems.php` · `AppServiceProvider` (`uploads` limiter) · `routes/api.php`.

**How the upload works (`DocumentService::submit`), in order:**

1. **Checks:** the account isn't suspended · tricycle papers need an active tricycle (422 `TRICYCLE_REQUIRED` "Idagdag muna ang tricycle mo.") · the right number of files: the license needs exactly **one front and one back**, the others exactly one (422 `FILES_INVALID`).
2. **Store the files first**, on the **private** disk (`storage/app/private/driver-documents/{driver_id}/`) under **random names**; the database keeps only the path, the original name, the detected type and the size.
3. **One database transaction:**
   - **replace unreviewed uploads:** a pending submission with no review yet (e.g. a blurry photo) is deleted together with its file rows;
   - **the renewal rule:** if the current document is approved and not expired, it **stays current** and the new one waits as a renewal (the driver stays eligible); otherwise the old one stops being current and the new one becomes current;
   - insert the document and its file rows.
4. **If the transaction fails**, the files written in step 2 are deleted (a disk write can't be rolled back by the database). **After success**, the replaced upload's files are deleted.
5. `DriverComplianceService::recalculate()`.

Rows locked with `lockForUpdate()`, so two quick taps on "Isumite" can't create two current documents (the database's "one current" UNIQUE index would refuse it anyway).

**Security choices (for the defense):**

| Threat | Protection |
|---|---|
| A program or script disguised as a photo | `mimes:jpg,jpeg,png,pdf` checks the file's **content** (PHP finfo), not its name. Proven with a **real** file of Windows program bytes named `clearance.jpg` → 422, nothing saved |
| Huge files filling the disk | `max:5120` (5 MB per file), 1–2 files, and the `uploads` rate limit |
| Someone guessing file URLs | There are none: random names, private disk, no URL or path in any response. Laravel 12's built-in `/storage` serving of the private disk (`'serve' => true`) was **switched off**; the only way to a file will be the admin streaming endpoint (7.4) |
| A driver reading another driver's papers | Every lookup goes through the logged-in driver's own documents → 404 |
| ID photos left on the phone | (Mobile, 7.7) photos stay in memory only until uploaded |

**Requirement names in two languages.** The four seeded requirements get their name and description from `lang/{fil,en}/requirements.php` by their stable `code` (e.g. `or_cr` → "OR/CR ng tricycle" / "Tricycle's OR/CR"). A requirement the admin adds later has no entry there, so the app shows it exactly as the admin typed it. The language test now also checks that both files list the same codes.

**Tests** (`tests/Feature/Drivers/DocumentTest.php`, 14, on a fake private disk: `Storage::fake('local')`):

| Test | Expected |
|---|---|
| Requirement list | 4 definitions; "OR/CR ng tricycle" in Taglish, "Tricycle's OR/CR" with `Accept-Language: en` |
| New driver's checklist | pending_verification · all missing · OR/CR and MTOP locked |
| License front + back | 201 · pending · current · 2 files on the private disk under `driver-documents/{id}/` · **no path or URL in the response** |
| One file, or two fronts | 422 `FILES_INVALID` / "Kailangan ang harap at likod." · nothing saved, no file left on disk |
| Program renamed `.jpg` (real file) | 422 "JPG, PNG, o PDF lang ang tinatanggap." · nothing saved |
| PDF / 6 MB file | Accepted / 422 "Hanggang 5 MB lang bawat file." |
| Expiry missing / in the past | 422 with the matching message |
| OR/CR without a tricycle, then with one | 422 `TRICYCLE_REQUIRED`, then 201 attached to the tricycle |
| Replace an unreviewed upload | Still 1 document; the old file is **gone from disk** |
| Upload after a rejection | New one current; the rejected one stays (history) |
| **Renew an approved license** | New one **not** current; driver **still verified**; checklist shows the renewal and `days_until_expiry` |
| All four submitted | under_review |
| Read own document / another driver's | 200 with history / 404 |
| Passenger uploads | 403 `FORBIDDEN_ROLE` |

**Problems found**

| # | Problem | Cause | Fix |
|---|---|---|---|
| 1 | The disguised-program test **passed the upload** (201) at first | `UploadedFile::fake()` files report their type from their **name**, so the test proved nothing | The test builds a **real** temporary file with program bytes; Laravel then reads the content and refuses it. Lesson: a security test must use what an attacker would really send |
| 2 | Reading the error for `files.0` returned nothing | A dot in a JSON path means nesting, and the field name itself contains a dot | Read the error by its plain key: `$response->json('errors')['files.0']` |
| 3 | PHP's own limit is **2 MB per file** (`upload_max_filesize=2M` in `C:\php 8.5.6\php.ini`), below the 5 MB rule | PHP's default settings | Raise it in php.ini (`upload_max_filesize = 6M`, `post_max_size = 16M`) and restart `php artisan serve`. The phone also compresses photos to well under 2 MB (7.7) |

**Nothing to test on the phone yet:** the upload screen comes in 7.8.

### 7.4 Admin review API (played with Postman until Phase 14)

**Endpoints** (all behind `auth:sanctum` + `role:admin`; prefix `/api/v1/admin`):

| Method | Endpoint | What it does |
|---|---|---|
| GET | `/driver-verifications?status=to_review` | **The review queue**: drivers with at least one pending document, **longest-waiting first** (fair), each with the documents to check and whether it's a *renewal*. Other filters: `pending_verification`, `under_review`, `verified`, `rejected`, `expired`. 20 per page |
| GET | `/driver-documents/{id}` | Everything needed to decide: driver, **the tricycle's plate** (compare with the photo), typed details, files (with an authenticated `url`), review history with the reviewer's name |
| GET | `/driver-documents/{id}/files/{fileId}` | **Streams the photo or PDF**: the only way to a document file |
| POST | `/driver-documents/{id}/approve` | Optional `expires_at` to correct the date read on the photo |
| POST | `/driver-documents/{id}/reject` | `reason` required |
| POST | `/driver-documents/{id}/request-resubmission` | `reason` required |
| POST | `/drivers/{id}/suspend` | `reason` required; the driver is set offline |
| POST | `/drivers/{id}/reactivate` | Account active again; status recalculated |

**Files:** `app/Services/{Audit,DocumentReview,DriverAccount}Service.php` · `app/Http/Requests/Admin/{Reason,ApproveDocument}Request.php` · `app/Http/Resources/AdminDriverDocumentResource.php` · `app/Http/Controllers/Api/V1/Admin/{DriverVerification,DriverDocument,DriverAccount}Controller.php` · `routes/api.php` · new lines in `lang/{fil,en}/{api,validation}.php` · `postman/PapayaHatidGo.postman_collection.json`.

**What every decision does (`DocumentReviewService`), in one transaction:**

1. Lock the document; only a **pending** one can be decided (else 409 `DOCUMENT_NOT_PENDING`: a decision is final; a new upload starts a new review).
2. Set the status; for an **approved renewal**, the old document stops being current *now* (it stays "approved" in the history) and the renewal becomes current. A **rejected renewal** leaves the approved one in place, so the driver stays verified.
3. Write a **review row** (action, reason, reviewer): what the driver reads.
4. Write an **audit_logs row** (who, action, before → after, reason, IP): what the school / LGU could audit later.
5. After the transaction: `DriverComplianceService::recalculate()`.

**Approve safeguards:** the admin may correct the expiry date; a requirement that expires can't be approved without a date (`EXPIRY_REQUIRED`); a document that **expired while waiting** can't be approved (`DOCUMENT_EXPIRED`).

**The file endpoint (privacy, for the defense):** the file must belong to the document in the URL (another document's file id = 404) · `Cache-Control: private, no-store` (no copy stays in a browser cache) · `X-Content-Type-Options: nosniff` (the browser can't reinterpret a file as a page or script) · **every viewing is logged** (`driver_document.file_viewed`): these are people's IDs, so "who looked at my license?" has an answer.

**Two scope decisions (recorded):**
- **Notifications to the driver** ("approved", "please fix") arrive in **Phase 13**. Until then the driver sees the result and the reason on the checklist (`GET /drivers/me/requirements`).
- **No separate "reject tricycle" endpoint yet.** It would need a place to store a reason the driver can read (a reason-less rejection is an anti-goal of the brief). An admin who sees a wrong plate rejects the **OR/CR** with "Hindi tugma ang plate number": the driver gets the reason and the tricycle can't be verified. The manual tricycle override comes with the admin web (Phase 14).

**Tests** (`tests/Feature/Drivers/AdminReviewTest.php`, 13: the driver uploads through the real endpoint, the admin decides through the real endpoint):

| Test | Expected |
|---|---|
| Driver / passenger call admin endpoints | 403 |
| Review queue | Only drivers with pending documents, longest-waiting first, with plate and document names |
| Document detail | Tricycle plate, file links, **no disk path** |
| File streaming | 200 · `image/jpeg` · `nosniff` · `no-store` · exact file bytes · viewing logged · another document's file id → 404 |
| Approve all four | Driver **verified**, tricycle **verified**, reviewer name in history, 4 audit rows with the morph name `driver_document` |
| Reject without / with reason | 422 "Ilagay ang dahilan. Babasahin ito ng driver." / rejected, and **the driver's checklist shows "Malabo ang litrato"** |
| Request resubmission | resubmission_required with the reason |
| Decide twice | 409 `DOCUMENT_NOT_PENDING` |
| Correct the expiry on approval | New date saved; audit shows old → new |
| Expired while waiting | 422 `DOCUMENT_EXPIRED`, still pending |
| Approve a renewal | Renewal current, old one non-current but still "approved", driver verified |
| Reject a renewal | Driver stays verified |
| Suspend → upload → reactivate | Suspended + offline · upload 403 `ACCOUNT_SUSPENDED` · active + verified again · both audited with the reason |

### How to use the Postman collection (play admin)

1. Install **Postman** (free) → **Import** → `papaya-hatidgo-api/postman/PapayaHatidGo.postman_collection.json`.
2. Make sure WAMP is green and `php artisan serve` runs.
3. **Driver › 1. Log in** (driver2) → **Driver › 3. Upload clearance**: in `files[]` click *Select files* and pick any photo → Send (201). *(Or upload from the phone once 7.8 exists.)*
4. **Admin › 1. Log in** → the token is saved automatically.
5. **Admin › 2. Review queue** → saves the first `document_id` and `driver_id`.
6. **Admin › 3. Document detail** → saves `file_id`. **4. View file** shows the photo in Postman.
7. **5. Approve**, **6. Reject** or **7. Request resubmission** → then **Driver › 2. My checklist** to see what the driver sees.
8. Set the collection variable `lang` to `en` to get English messages.

### 7.5 Daily expiry job + the business timezone

**The job:** `php artisan documents:expire` (`app/Console/Commands/ExpireDocuments.php` → `app/Services/DocumentExpiryService.php`), scheduled in `routes/console.php` **every day at 00:05 Philippine time**, `withoutOverlapping()`.

For every **approved** document whose expiry date has passed:
1. status → `expired`;
2. a review row `expired_by_system` with **no reviewer** (the system; allowed by `chk_review_actor` since Phase 4);
3. an audit row `driver_document.expired` with **no actor** (the system).

Then **once per affected driver**: `recalculate()` → compliance `expired`, **set offline**, and, if it was the OR/CR or MTOP, the tricycle goes back to **pending** (the automatic rule from decision #1).

**Why a job, if the app already treats overdue documents as expired?** Step 7.1's "effective status" means nobody stays verified even an hour after a date passes; that protects the *rules*. The job makes it true **in the database** (the stored status, the history, the audit trail), so reports and the admin queue (Phase 14) and the coming reminders (Phase 13) read the real state.

**Safe to run any number of times:** an expired document isn't touched again (second run = "0 document(s) expired"). **Pending** documents are left alone: the admin can't approve an expired one (`DOCUMENT_EXPIRED`, step 7.4).

**The timezone problem this step exposed (for the defense).** Phase 4 runs the app and MySQL on **UTC**, which is right for timestamps. But an expiry **date** like 2026-10-01 means *valid through October 1 in the Philippines*. In UTC, "today" changes at **8:00 AM Manila time**, so every expired document would have counted as valid for 8 extra hours (and "can't be in the past" validation would be wrong for the same 8 hours).

**Fix:** `config/app.php` gets `business_timezone` = `Asia/Manila` (overridable with `BUSINESS_TIMEZONE`), and `app/Support/BusinessDate.php` answers "what is today on the Philippine calendar?". Dates are compared as `YYYY-MM-DD` strings, so the hour and timezone a date object carries can't shift the answer. **Every date rule now uses it:** the job, `DriverComplianceService::effectiveStatus()` (7.1), the admin's approve check (7.4), `days_until_expiry` (7.3), and the `after:today` / `before_or_equal:today` validations (7.3, 7.4). Timestamps (`created_at`, `submitted_at`) are untouched and stay UTC.

**Tests** (`tests/Feature/Drivers/DocumentExpiryTest.php`, 5, using `travelTo()` to move the clock):

| Test | Expected |
|---|---|
| An overdue clearance | expired · history `expired_by_system`, no reviewer · audit with no actor · driver **expired** and **offline** |
| An overdue OR/CR | The tricycle goes back to **pending** |
| Valid and pending documents; a second run | Untouched; the second run expires nothing (1 audit row total) |
| **Philippine calendar, not UTC** | At 15:30 UTC Oct 1 (= 23:30 Oct 1 Manila) a document expiring Oct 1 is **still valid**; at 16:30 UTC Oct 1 (= 00:30 **Oct 2** Manila) it **expires**, though UTC still says Oct 1 |
| The schedule | `documents:expire` at `5 0 * * *` in `Asia/Manila` |

**Problem found:** the "tricycle back to pending" test failed at first because it created a verified driver on Oct 10 with an OR/CR that expired Oct 1. The 7.1 rule correctly treated the paper as expired **at creation**, so the tricycle was never verified. Fixed the test (verify on Sep 30, then move the clock to Oct 10); the failure itself confirmed the effective-status rule works.

**How it runs:**
- **By hand** (any time, e.g. during the defense): `php artisan documents:expire` in `papaya-hatidgo-api`.
- **Automatically on the laptop:** keep `php artisan schedule:work` running in a second terminal (it runs every scheduled task on time, including Sanctum's token cleanup).
- **On a real server:** one cron entry, `* * * * * php artisan schedule:run`.
- `php artisan schedule:list` shows the time in **UTC** (`5 16 * * *` = 16:05 UTC = 00:05 Manila).

**Not in this step:** the reminders 30 and 7 days before expiry (push notifications) come with Phase 13; the app already shows "Mag-e-expire sa {n} araw" from `days_until_expiry`.

**Part A (API) is complete:** role guard + compliance rules (7.1), tricycles (7.2), uploads (7.3), admin review (7.4), expiry (7.5). Part B (the mobile screens) starts with 7.7.
