# Papaya HatidGo — Project Documentation

Index of the project's design and development documents. Each phase leaves a record: a **plan** written before building, and a **report** of what was done, the problems found, and how they were fixed.

## Documents

| Document | What it covers |
|---|---|
| [../PRODUCT.md](../PRODUCT.md) | Product facts: users, purpose, rules, scope, open decisions |
| [phase-0-analysis.md](phase-0-analysis.md) | System analysis: architecture, navigation, ERD, workflows, API, SQLite, GPS, notifications, security, testing, phases, decisions log |
| [system-structure.md](system-structure.md) | The three folders (API, mobile app, admin website): what each does, how they work together, why they're separate, how to run them, where the secrets live |
| [developer-start-checklist.md](developer-start-checklist.md) | Before you start developing: what to start, where to test (browser, phone, admin), `adb:reverse`, rebuilding, finishing and saving, troubleshooting |
| [operating-guide.md](operating-guide.md) | Step by step: start the system, prepare the phones, run the demo, shut down, troubleshooting, a printable checklist |
| [deploy-railway.md](deploy-railway.md) | Putting the API and MySQL online on Railway: why the first build failed, the variables to paste, the deploy settings, checks and fixes |
| [download-page.md](download-page.md) | The APK download page with its QR code and the user manual (served by the API at `/download`), and how to build the APK for it |
| [environment-setup.md](environment-setup.md) | JAVA_HOME, ANDROID_HOME, PATH and adb, explained |
| [building-apk-and-installing.md](building-apk-and-installing.md) | How-to: reopen in VS Code, run on phone, build/install an APK, make another app installable |
| [phase-1-mobile-setup.md](phase-1-mobile-setup.md) | Phase 1 report: Capacitor + Android setup |
| [phase-2-mobile-architecture.md](phase-2-mobile-architecture.md) | Phase 2 plan + report: folders, routing, guards, AuthService, interceptor |
| [phase-3-native-proof.md](phase-3-native-proof.md) | Phase 3 plan + report: geolocation, network, lifecycle services + diagnostics |
| [phase-4-laravel-mysql.md](phase-4-laravel-mysql.md) | Phase 4 plan + normalization record + report: Laravel 13 + MySQL 8.4 |
| [phase-5-authentication.md](phase-5-authentication.md) | Phase 5 plan + report: auth API, secure token storage, first real design (mockup look), Taglish validation |
| [../DESIGN.md](../DESIGN.md) | The design system (colors, type, buttons, fields, rules every screen follows), recorded from the Phase 5 build, extended in Phase 7 (status chips, photo slot, checklist, action sheets) |
| [phase-6-sqlite.md](phase-6-sqlite.md) | Phase 6 plan + report: local SQLite (local user, settings), offline start, versioned schema, token-in-log fix |
| [phase-7-driver-requirements.md](phase-7-driver-requirements.md) | Phase 7 plan + report: tricycle + document uploads, compliance rules, admin review (Postman), driver checklist screens, English/Taglish |
| [phase-8-subscriptions.md](phase-8-subscriptions.md) | Phase 8 plan + report: plans, PayMongo checkout (test mode) + local test gateway, signed webhook, reconciliation, go-online and booking gates, Subscription screen |
| [phase-9-rides.md](phase-9-rides.md) | Phase 9 plan + report: fares, booking gates, matching, race-safe accept, ride state machine, cancel/expiry, privacy, RIDE/MATCH tests |
| [phase-10-passenger-rides.md](phase-10-passenger-rides.md) | Phase 10 plan + report: Book (map + 3 steps), active ride screen, Rides history, MapService (Leaflet + OSM), emulator end to end |
| [phase-11-driver-rides.md](phase-11-driver-rides.md) | Phase 11 plan + report: Driver Home (offline / online, compact map), request takeover, driver ride screen, earnings, location cadence, two-client ride on the emulator |
| [phase-12-maps.md](phase-12-maps.md) | Phase 12 plan + report: route line, live gliding driver marker, stale positions, the trip's driven path, MapTiler (key kept local) |
| [phase-13-notifications.md](phase-13-notifications.md) | Phase 13 plan + report: in-app Alerts, Firebase push (FCM HTTP v1 from Laravel), who gets what, reminders, permission, finish review |
| [update-cancel-and-place-search.md](update-cancel-and-place-search.md) | After Phase 13: the passenger can't cancel once the driver is on the way (unless 10 min late); place search and the pickup named from the map |
| [phase-14-admin-web.md](phase-14-admin-web.md) | Phase 14 plan + report: the admin website (repo papaya-hatidgo-admin), admin API, photo review via token, live map, insert-only fares, reports, audit log |
| [IMPECCABLE-GUIDE.md](IMPECCABLE-GUIDE.md) | When and how to use the impeccable design skill |
| [design-briefs/passenger-booking.md](design-briefs/passenger-booking.md) | ✅ Confirmed UX brief: passenger booking flow (pickup → destination → choose ride + Mag-book) |
| [design-briefs/active-ride.md](design-briefs/active-ride.md) | ✅ Confirmed UX brief: passenger active ride screen (searching → arriving → trip/Balikan legs → pay + rate) |
| [design-briefs/driver-requirements.md](design-briefs/driver-requirements.md) | ✅ Confirmed UX brief: driver requirements + verification (Home checklist, upload, review, renewal) |
| [design-briefs/driver-home.md](design-briefs/driver-home.md) | ✅ Confirmed UX brief: driver Home (online/offline, compact map, full-screen request alert) |

## Progress

Phase numbers follow [phase-0-analysis.md § M](phase-0-analysis.md#m-development-phases).

| # | Phase | Status |
|---|---|---|
| 0 | Requirements, architecture, ERD, API, test plan | ✅ Done |
| 1 | Mobile setup: Capacitor + Android | ✅ Done (browser, emulator, Redmi Note 13 Pro 5G) |
| 2 | Mobile architecture | ✅ Done (routing, tabs, guards, AuthService skeleton, interceptor) |
| 3 | Capacitor native proof (GPS, network, lifecycle) | ✅ Done (core verified; phone error-case tests T4–T9 pending) |
| 4 | Laravel + MySQL (WAMP MySQL 8.4, repo papaya-hatidgo-api) | ✅ Done (30 tables, 34 integrity tests, health endpoint) |
| 5 | Authentication (+ first impeccable build → DESIGN.md) | ✅ Done (Sanctum auth, secure token, Get Started + auth screens, DESIGN.md, 41 API tests) |
| 6 | SQLite (`local_user`, `app_settings`, offline start) | ✅ Done (versioned schema, offline start, returning users → Login, CRUD tested on the Redmi, 33 unit tests) |
| 7 | Driver requirements + vehicles | ✅ Done (tricycle + 4 documents from the camera, admin review via Postman, automatic tricycle verification, daily expiry, English/Taglish; API 108 tests, mobile 55 tests; Redmi run pending) |
| 8 | Subscriptions + PayMongo (test mode) | ✅ Done (pay → server-confirmed active; signed + idempotent webhook; reconciliation; go-online and booking gates; Subscription screen for both roles; API 149 tests, mobile 65 tests; real PayMongo keys pending) |
| 9 | Ride state machine + matching (backend) | ✅ Done (fares, booking gates, nearest-eligible matching, race-safe accept proven live, every transition + 409s, cancel/expiry, privacy; API 194 tests) |
| 10 | Passenger ride screens (includes a basic map: tiles, center pin, markers; see booking brief) | ✅ Done (Book on a Leaflet map in 3 steps, active ride screen, cancel, rating, Rides history; P1–P11 on the emulator; API 196, mobile 78 tests) |
| 11 | Driver ride screens + earnings | ✅ Done (go online with keep-awake + location cadence, full-screen request with tone and real countdown, accept / skip, every ride step incl. Balikan, driver cancel with reason codes, earnings day / week / month, Rides history; D1–D11 on the emulator with the passenger as a second client; API 200, mobile 101 tests; two-phone run pending) |
| 12 | Maps: live driver marker, route line | ✅ Done (dashed route on Book and both ride screens, gliding driver marker, approach line, stale positions shown as old, the trip's driven path on finished rides, MapTiler with a local key; M1–M7 on the emulator; API 206, mobile 109 tests) |
| 13 | Notifications (in-app + FCM) | ✅ Done (Alerts tab for both roles with unread badge; real Firebase push for requests, ride steps, cancels, papers, subscriptions; reminders sent once; phone tokens tied to the login; N1–N4, N9, N10 on the emulator with real FCM; API 243, mobile 122 tests) |
| 14 | Admin web dashboard (built before 13, the student's choice) | ✅ Done (new repo papaya-hatidgo-admin: Angular + Tailwind; verification with photo review, live map, rides, users, fares + settings, plans + payments, requirements, reports, audit log; admins only; A1–A11 in the browser; API 217, admin 9 tests) |
| 15 | Full testing + case study documentation | ⏳ |

## Development protocol (every feature)

```text
Requirement → Flow (impeccable shape) → Data (ERD) → API contract
  → Backend + tests → Mobile service → Mobile UI (impeccable refine) → Device test → Commit
```
