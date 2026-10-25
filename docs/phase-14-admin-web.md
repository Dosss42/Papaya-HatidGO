# Phase 14 — Admin web dashboard

**Built before Phase 13** (the student's choice): the admin website uses the API that already exists; notifications don't block it.

**Goal:** the admin runs Papaya HatidGo from a browser, with no Postman:
- verify drivers' papers and tricycles;
- watch live rides and online drivers on a map, and cancel a stuck ride;
- manage users (suspend / reactivate);
- set fares, ride types, matching and the service area;
- manage plans, see payments, and activate a subscription by hand (demo fallback);
- read reports and the audit log.

**Done when (phase-0 § M):** verification, fares, plans, monitoring, reports and audit all work from the website.

**Rules come from:** phase-0 § A (an **Angular** admin web over the same `/api/v1`), § D.4 (admin review), § G (the admin API list), § K (every admin write is audited; files only through the authorized endpoint), DESIGN.md (the brand tokens), decision 16 (**Tailwind**, chosen by the student on 2026-10-26).

## 1. What already exists (API)

| Admin endpoint | From |
|---|---|
| `GET /admin/driver-verifications`, documents (show, file stream, approve / reject / request-resubmission) | Phase 7 |
| `POST /admin/drivers/{id}/suspend \| reactivate` | Phase 7 |
| `GET /admin/subscriptions`, `POST /admin/subscriptions/{id}/activate` | Phase 8 |
| `GET /admin/rides`, `POST /admin/rides/{id}/cancel` | Phase 9 |
| `AuditService`, the `role:admin` middleware, the admin seed account (Ana) | Phases 5–7 |

## 2. Implementation steps

| Step | Task |
|---|---|
| 14.1 | **API, missing admin endpoints** (all writes audited, all with tests): dashboard counts · users list + status · driver requirements · fare settings (insert-only) · system settings · subscription plans · transactions · reports (rides, revenue, drivers) · audit log · online drivers (for the map) |
| 14.2 | **New project `papaya-hatidgo-admin`** (own folder + git repo): Angular 22 + Tailwind 4 with the DESIGN.md tokens; admin-only login; the shell (sidebar, top bar); API client with the same error shape as the mobile app |
| 14.3 | **Dashboard** + **Verification** (queue → documents with the file viewer → approve / reject / resubmission) |
| 14.4 | **Rides** (live map: online drivers + active rides; list with filters; cancel with reason) · **Users** (search, suspend / reactivate) |
| 14.5 | **Fares & settings** · **Plans & payments** (plans, transactions, manual activation) · **Requirements** |
| 14.6 | **Reports** (rides, revenue, drivers, with charts) · **Audit log** |
| 14.7 | Tests · browser check of every screen · finish review · report · commits |

## 3. Decisions

The student asked for the phase straight through; these were taken without asking (decision 1 is the student's).

| # | Decision | Why |
|---|---|---|
| 1 | **Tailwind CSS** (v4), themed with DESIGN.md's tokens (colors, Atkinson Hyperlegible, radius) | The student's choice (phase-0 decision 16) |
| 2 | A **separate project and git repo**, `papaya-hatidgo-admin`, next to the other two | The admin is a different app with a different audience (desktop browser) and release; it shares only the API |
| 3 | **Desktop-first** (≥ 1024 px: a sidebar; narrower: a top menu), keyboard-friendly, still usable on a tablet | Admin work happens at a desk; DESIGN.md's floor (16 px text, mark + word) still applies |
| 4 | Login with the same `POST /auth/login`; **only `role = admin` may enter** (others are logged out at once). The Bearer token is kept in **sessionStorage** (gone when the tab closes), never in localStorage | Same auth as the mobile app, no new server mechanism; sessionStorage limits how long a stolen token lives on a shared office PC |
| 5 | **Fares are insert-only**: "saving" a fare creates a new row with an effective time (now or later); the history stays visible | phase-0: fares are versioned so old rides keep the fare they were priced with |
| 6 | **Settings are validated on the server by type and range** (e.g. timeout 30–600 s, radius 0.5–20 km), and every change is audited with old → new values | A typo must never stop matching for the whole town |
| 7 | The live map polls every **10 s** (online drivers + active rides); MapTiler with a git-ignored key, like the mobile app | Enough for monitoring; no websockets in the MVP |
| 8 | Charts are hand-drawn SVG (bars / lines), no chart library | Few, simple charts; one dependency less to explain |
| 9 | The Laravel default CORS (any origin on `api/*`) is fine for development with Bearer tokens; **before release** it's restricted to the admin's real address | Recorded so it isn't forgotten |

## 4. Test plan (summary)

| # | Test | Expected |
|---|---|---|
| A1 | A passenger or driver logs into the admin site | Refused: "This website is for administrators." |
| A2 | Admin logs in | Dashboard with live counts |
| A3 | Approve / reject a document (with reason) | The driver's checklist changes; the audit log has the action |
| A4 | Live map | Online drivers and active rides appear; a cancelled ride disappears |
| A5 | Suspend a passenger | They can't book; reactivate restores it |
| A6 | New fare effective now | The next estimate uses it; the old fare stays in the history |
| A7 | Invalid setting (e.g. timeout 5 s) | Refused with the reason; nothing changes |
| A8 | New plan / price change | The Subscription screen in the app shows it |
| A9 | Manual activation | The subscription is active; audited |
| A10 | Reports for a date range | Totals match the database |
| A11 | Audit log | Every admin write above appears with old → new values |

---

## 5. Implementation log

| Step | Result |
|---|---|
| 14.1 | API: 10 admin controllers (dashboard, live map, users, requirements, fares, settings, plans, transactions, reports, audit log), 19 new routes, messages in en + fil, `AdminWebApiTest` (11). API **217 tests** ✅ |
| 14.2 | New repo `papaya-hatidgo-admin`: Angular 22 + Tailwind 4 themed with DESIGN.md, self-hosted Atkinson Hyperlegible, admin-only login, shell (sidebar / narrow menu), API client, MapTiler key kept local ✅ |
| 14.3 | Dashboard · Verification queue (tabs by status) · document review (photos via token-fetched blobs, approve with expiry, reject / ask again with a reason) ✅ |
| 14.4 | Rides & live map (online drivers, active rides, the service area, every 10 s; list with filters; cancel with reason) · Users (search, suspend / reactivate) ✅ |
| 14.5 | Fares & settings (insert-only fares now or scheduled, history; grouped settings with ranges) · Plans & payments (plans, payments, manual activation) · Requirements ✅ |
| 14.6 | Reports (rides, revenue, top drivers, SVG charts + tables) · Audit log (filters, old → new) ✅ |
| 14.7 | Unit tests (admin 9) · browser checks of every page (desktop and 400 px) · finish review: 8 fixes applied ✅ |

### Problems found

| # | Problem | Cause | Fix |
|---|---|---|---|
| 1 | A suspended passenger could still book in one test | The test reused the in-memory user (still "active"); a real request reads it fresh from the database | `refresh()` in the test (no app bug) |
| 2 | A renamed plan would never show in the app | The app shows seeded plans by their translated name, so the stored name was ignored | The translation is used only while the stored name is still one of the originals |
| 3 | Edits to PHP / TypeScript lost their backslashes or backticks | Shell quoting inside one-line scripts | Edits done as script files; every result rebuilt and tested |
| 4 | Users page 250 px wider than a phone | A table's visually-hidden "Actions" label (absolutely positioned) escaped its scroll box | Scroll boxes are positioned (`.overflow-x-auto { position: relative }`); every page 0 px overflow at 400 px |
| 5 | Settings inputs had no real `name` | `[name]` is an input of `ngModel`, not the element's attribute | `[attr.name]` as well (autofill, tests) |
| 6 | Setting errors read "the settings.matching.request timeout seconds field…" | Laravel built the name from the key | Each field is called "value" ("halaga") under its own input |
| 7 | **The student saw a blank page** opening the site | The route guards called `inject()` after an `await`; Angular allows it only before. My checks always started at `/login`, the one path that didn't hit it | `inject()` first, then wait. A fresh visit to `/`, `/rides`, `/audit` now lands on "Log in" |
| 8 | The document page reloaded forever (after review fix 2) | Its `effect` tracked the photo signals that `load()` reads | Only the id is tracked (`untracked`) |
| 9 | A ride stuck in "Looking for a driver" since Oct 15 | Requests expire through the scheduler (`rides:expire`), which isn't running on the dev PC | Not an app bug: the admin site shows it and can cancel it. On the server, the scheduler runs every minute |

---

## 6. Step notes (explained)

### 6.1 How the admin website is built

A separate Angular project talks to the same API as the app. Pages call one `Api` service, which returns the parsed answer or an `ApiError` (the same error shape as the mobile app); an interceptor adds the Bearer token. Tailwind's theme holds DESIGN.md's colors, type and radius, so `bg-papaya`, `text-ink-soft` or `rounded-hg` mean exactly what they mean in the app. A few shared components keep the screens consistent: the status chip (a dot + the word), a reason dialog (a native `<dialog>`: focus stays inside, Esc closes), a pager, and an SVG bar chart.

### 6.2 Only admins, and the token's life

The login uses the app's `POST /auth/login`. If the account isn't an admin, the website immediately logs that token out on the server (so no unused token stays alive) and says "This website is for administrators." The admin's token lives in **sessionStorage**: it survives a page reload but disappears when the tab closes, which matters on a shared office PC. Any 401 (expired or revoked) ends the session and returns to the login page. The token is only ever sent to the API's own address.

### 6.3 Reviewing a paper safely

A driver's photos are never public files. The page asks the API for each file **with the admin's token**, receives the bytes, and shows them from memory (a `blob:` address that exists only in that tab; released when leaving). The API records each viewing in the audit log. **Approve** stays locked until every photo has actually loaded, and a photo that fails shows "Try again" instead of silently letting the admin approve unseen (finish review #2). Approving asks for the expiry date when the paper has one; rejecting or asking for a new photo needs a reason, because the driver reads it in the app.

### 6.4 Fares are versions, settings are checked

"Saving" a fare never changes the old one: it adds a new version with the time it takes effect (now, or later in Philippine time). Each ride keeps a link to the version it was priced with, so old receipts stay correct, and the history shows who changed what. Settings go to the server as a set; each value is checked by its type and an allowed range (e.g. the time to find a driver must be 30–600 s), and if any value is wrong, **nothing** is saved. One more rule: at least one ride type must stay on, or nobody could book. Every changed setting is written to the audit log with its old and new value.

### 6.5 The live map

Every 10 seconds the page asks `GET /admin/live` for everything at once: the service area, drivers who are switched online with their last position, and the active rides. A driver is drawn with the tricycle mark; **filled** when on a ride, **grey** when online but not located lately (the server no longer offers them requests). Rides show their pickup, destination and the dashed route. The map is framed on the service area once; after that the admin can pan freely. The header says the time of the last update, and says so when a refresh fails (finish review #1), so old data is never mistaken for live.

### 6.6 Reports

Each report covers a date range (Philippine calendar, at most 92 days). The server lists **every** day, including empty ones, so charts have no gaps; the page shows the totals, a bar chart, and the numbers day by day (a chart never carries information alone). "No driver found" is counted apart from cancellations: those are requests nobody accepted in time, a sign that more drivers are needed.

### 6.7 Finish review (14.7)

The `impeccable-finish-reviewer` returned **8 material fixes**, all applied and rechecked in the browser:

| # | Finding | Fix |
|---|---|---|
| 1 | The live map always said "updated 0 s ago", even while refreshes failed | The clock time of the last update + "the last refresh failed" |
| 2 | A paper could be approved before its photos loaded | Per-file loading with Try again; Approve only when all are on screen |
| 3 | Raw cancel codes on the rides list | Plain words (`reasonLabel`); confirmed in the new capture |
| 4 | A fare error stayed next to a later "Saved" | The error is cleared on each save and shown inside the fare form |
| 5 | Manual activation could name a different email than the one searched | The searched email is kept and used |
| 6 | Scheduled fares used the PC's time zone | Read as Philippine time (`+08:00`), labelled so |
| 7 | Dialogs had no accessible name; half-built tabs; the map hid its controls from screen readers | `aria-labelledby` on every dialog, toggle buttons with `aria-pressed`, no `role="img"` on the map |
| 8 | The map key used symbols unlike the markers; green on states that aren't success; low-contrast faded rows | Real marker copies in the key; papaya chips for On / On sale / Current / Active; no fading |

---

## 7. Tests

| Kind | Result |
|---|---|
| API | **217 tests** (11 new in `AdminWebApiTest`: admin-only, dashboard counts, suspend a passenger / a driver, admin locked, insert-only fare used by the next estimate, settings ranges + all-or-nothing + one ride type, plans, requirements, live map, reports + range limit, audit log) |
| Admin unit (Vitest) | **9 tests** (format helpers in Philippine time, admin-only login revokes a non-admin's token, sessionStorage not localStorage, 401 ends the session) |
| Browser (headless Chrome against the real API) | Every page loads with no errors (desktop) and fits 400 px; A1 refused; A5 suspend + reactivate; A7 invalid setting refused under its field; A11 audit shows old → new; a paper's photo loads through the token; a fresh visit lands on "Log in" |

---

## 8. Phase 14 report (summary)

**Result:** ✅ The **done when** condition is met: verification, fares, plans, monitoring, reports and audit all work from the admin website, with no Postman.

| | Phase 14 added | Totals now |
|---|---|---|
| API (`papaya-hatidgo-api`) | 19 new admin endpoints, all writes audited | **217 tests** |
| Admin website (`papaya-hatidgo-admin`, new) | 11 pages: login, dashboard, verification + review, rides & live map, users, fares & settings, plans & payments, requirements, reports, audit | **9 unit tests** |

**Decisions recorded:** Tailwind (the student's choice) and the eight others in § 3.

**For the student:**
- **Open it:** `npm start` in `papaya-hatidgo-admin`, then **<http://localhost:4300>**, log in as `admin@example.test` / `password` (the mobile app at 4200 refuses admins by design).
- **The MapTiler key** is copied into the admin repo's git-ignored `map-key.ts` on this PC.
- **Changes are real:** the admin site edits the same dev data the app uses (fares, settings, plans).
- **The dev scheduler isn't running**, so old requests don't expire by themselves (HG-000012). On a server, `php artisan schedule:work` (or a cron) runs it.
- **Before release:** the real API address in `environment.prod.ts`, CORS limited to the admin's address, the MapTiler key restricted.

**Next:** Phase 13, notifications (needs your Firebase project's `google-services.json`).
