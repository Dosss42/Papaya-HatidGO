# Papaya HatidGo — Project Documentation

Index of the project's design and development documents. Each phase leaves a record: a **plan** written before building, and a **report** of what was done, the problems found, and how they were fixed.

## Documents

| Document | What it covers |
|---|---|
| [../PRODUCT.md](../PRODUCT.md) | Product facts: users, purpose, rules, scope, open decisions |
| [phase-0-analysis.md](phase-0-analysis.md) | System analysis: architecture, navigation, ERD, workflows, API, SQLite, GPS, notifications, security, testing, phases, decisions log |
| [environment-setup.md](environment-setup.md) | JAVA_HOME, ANDROID_HOME, PATH and adb, explained |
| [phase-1-mobile-setup.md](phase-1-mobile-setup.md) | Phase 1 report: Capacitor + Android setup |
| [phase-2-mobile-architecture.md](phase-2-mobile-architecture.md) | Phase 2 plan + report: folders, routing, guards, AuthService, interceptor |
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
| 3 | Capacitor native proof (GPS, network) | ⏭️ Next (after the impeccable shape sessions) |
| 4 | Laravel + MySQL | ⏳ |
| 5 | Authentication (+ first impeccable build → DESIGN.md) | ⏳ |
| 6 | SQLite | ⏳ |
| 7 | Driver requirements + vehicles | ⏳ |
| 8 | Subscriptions + PayMongo (test mode) | ⏳ |
| 9 | Ride state machine + matching (backend) | ⏳ |
| 10 | Passenger ride screens (includes a basic map: tiles, center pin, markers; see booking brief) | ⏳ |
| 11 | Driver ride screens + earnings | ⏳ |
| 12 | Maps (Leaflet): live driver marker, route line (basic map arrives in Phase 10) | ⏳ |
| 13 | Notifications (in-app + FCM) | ⏳ |
| 14 | Admin web dashboard | ⏳ |
| 15 | Full testing + case study documentation | ⏳ |

## Development protocol (every feature)

```text
Requirement → Flow (impeccable shape) → Data (ERD) → API contract
  → Backend + tests → Mobile service → Mobile UI (impeccable refine) → Device test → Commit
```
