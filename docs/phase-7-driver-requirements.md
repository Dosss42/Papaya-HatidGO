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
