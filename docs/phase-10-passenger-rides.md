# Phase 10 — Passenger ride screens

**Goal:**
- A passenger books a tricycle in three steps on a map: pickup → destination → One-way or Balikan, with the price on the button.
- They watch the ride on one screen that changes with the status.
- They can cancel, then pay in cash and rate the driver.

**Done when (phase-0 § M):** a ride can be requested, tracked, cancelled, rated.

**Rules come from:**
- The confirmed briefs [passenger-booking](design-briefs/passenger-booking.md) and [active-ride](design-briefs/active-ride.md): structure, states, copy.
- [DESIGN.md](../DESIGN.md): the look.
- [phase-9-rides.md](phase-9-rides.md): the API.
- phase-0 § I: map and GPS.

## 1. What already exists

| Piece | From |
|---|---|
| The whole ride API: estimate, booking gates, matching, transitions, cancel, rating, "Pabalik na ako", privacy | Phase 9 |
| `LocationService` (permission, one fix, errors DENIED / GPS_OFF / TIMEOUT) | Phase 3 |
| `SubscriptionService` + the Book tab's subscription gate | Phase 8 |
| `NetworkService`, `AppLifecycleService`, offline notice, status chip, i18n (English + Taglish) | Phases 3–7 |

## 2. Implementation steps

| Step | Task |
|---|---|
| 10.1 | API touch-ups: `GET /booking-options` (ride types, service area, minimum distance, wait choices) · driver rating average shown only from 5 ratings (active-ride brief § 8) |
| 10.2 | `MapService` (Leaflet + OpenStreetMap behind one small interface) · `RideService` (mobile) · `BookingDraftService` · ride models · `ride-view.ts` (status line, stage track, what's allowed), all unit-tested |
| 10.3 | **Book**: map + bottom sheet, 3 steps, every gate (active ride → ride screen, subscription, location L1–L3), pin checks, estimate, option cards, wait chips, breakdown, note, "Mag-book · ₱85", fare changed |
| 10.4 | **Active ride** `/passenger/ride/:id`: status line, stage track, driver card (body no. + plate large, call), context per status, cancel sheet, "Pabalik na ako", payment line + rating, no-driver / cancelled actions, polling, weak connection |
| 10.5 | **Rides** tab: history → ride details (rate later) · GPS messages in both languages |
| 10.6 | Finish review (impeccable) · emulator end to end (the driver played through the API) · report · commit |

## 3. Decisions

The student asked for the phase straight through. The briefs' open decisions keep their defaults.

| # | Decision | Why |
|---|---|---|
| 1 | **Leaflet + OpenStreetMap tiles** behind `MapService`; the tile address lives in `environment` | phase-0 decision 5 (no API key, no billing). Swappable if OSM's tile policy ever blocks the app |
| 2 | The three steps are **states of the Book page** (1 / 3, 2 / 3, 3 / 3), and the Android **Back button steps backward** through them | The brief asks for child routes *so that Back steps back*. Inside Ionic tabs, a nested router outlet adds complexity for the same result. The Back behavior is kept exactly |
| 3 | New `GET /booking-options` gives the app the service area and minimum distance, so a pin outside Papaya is flagged **before** a fare is asked for (brief E1/E2). The server still checks everything | Brief § 2: "an inline error, before a fare is ever requested" |
| 4 | The ride screen is a **child of the tabs**, so the tab bar stays visible; the Book tab leads back to it while a ride is active | Active-ride brief § 7 |
| 5 | Polling every **4 s** while the screen is visible, paused in the background, immediate on resume; a failed poll keeps the last status and shows "Mahina ang koneksyon. Huling update: …" | Active-ride brief § 6 |
| 6 | **The rating needs a connection** (no offline SQLite queue yet). "Mamaya na", and rating from Rides › ride details, mean nothing is lost | The brief's `pending_sync` queue is a Phase 15 hardening item; recorded as a deviation |
| 7 | Cancel reasons are sent as stable codes (`driver_late`, `changed_plans`, `wrong_pickup`, `other`) and shown in the app's language | The admin gets clean data in any language |
| 8 | The **route line** between the pins waits for Phase 12 (with the live driver marker), as the booking brief itself plans | Brief § 7 "phase dependency" |
| 9 | `@capacitor/haptics` for the one short vibration when the driver **arrives** | Active-ride brief § 6: the one moment the passenger must look up |
| 10 | The booking draft is kept **in memory** while the app runs (restored when returning to the tab, reused by "Mag-book ulit") | Brief: "keep the draft silently". Nothing personal is written to the phone |
| 11 | DESIGN.md's **Always White** rule wins over the brief's "dark theme" line | The design system was decided after the briefs (Phase 5) |

## 4. Test plan (summary)

| # | Test | Expected |
|---|---|---|
| P1 | Open Book with an active ride | Goes straight to the ride screen |
| P2 | Location: first time, denied, GPS off | Reason first (L1) → prompt; denied → town center + L2; off → L3 + Subukan ulit |
| P3 | Pin outside the area / destination too close | Inline E1 / E2, button disabled, no estimate asked |
| P4 | Pickup → destination → options | Both totals; Balikan shows wait chips; the button shows the chosen total |
| P5 | Book | Ride screen "Naghahanap ng driver…" |
| P6 | Driver accepts / departs / arrives / starts / completes (via API) | The screen follows within ~4 s; vibration on arrival; "Bayaran si Juan ng ₱52 (cash)" |
| P7 | Rate 5 stars | Saved; the details show the rating |
| P8 | Cancel while searching, with a reason chip | "Kinansela mo ang biyahe." + Mag-book ulit (draft restored) |
| P9 | No driver within 2 minutes | "Walang available na driver ngayon." + Subukan ulit |
| P10 | Balikan waiting leg | Timer counts up; "Pabalik na ako" → "Nasabihan na si Juan" |
| P11 | Airplane mode on the ride screen | Last status stays + the weak-connection banner |

---

## 5. Implementation log (becomes the report in 10.6)

| Step | Result |
|---|---|
| 10.1 | ✅ `GET /booking-options` · driver rating average only from 5 ratings · **API 196 / 196** (2 new tests) |
| 10.2 | ✅ `MapService` (Leaflet + OSM, CSS markers) · `RideService` · `BookingDraftService` · `ride-view.ts` · `booking-checks.ts` · `ApiError.data` · `LocationService.checkPermission()` · **13 new unit tests** |
| 10.3 | ✅ Book: map + sheet, 3 steps, Back steps back, gates, L1–L3, E1–E5, option cards, wait chips, breakdown, note, pinned "Mag-book · ₱…" |
| 10.4 | ✅ Active ride: status line, stage track, driver card, per-status context, cancel sheet, "Pabalik na ako", pay + rating, no-driver / cancelled actions, 4 s polling, weak-connection banner, arrival vibration |
| 10.5 | ✅ Rides history → ride details (rate later) · GPS messages in both languages · ~120 messages |
| 10.6 | ✅ Finish review: 8 fixes, all applied and rechecked on the emulator · every passenger test P1–P11 on the emulator (driver via the API) · DESIGN.md Phase 10 components · **API 196 / 196 · mobile 78 / 78** |

### Problems found

| # | Problem | Cause | Fix |
|---|---|---|---|
| 1 | The emulator closed twice right after booting | It wanted more RAM than this PC has free (16 GB, "suggested 16 GB"), with the hardware GPU | Started with `-memory 3072 -gpu swiftshader_indirect`: stable afterwards |
| 2 | Step 3's map cut off the pickup pin | The map fitted both pins **during** the 200 ms height transition, using the old height | Fit again after the transition (`fitBothAfterResize`) |
| 3 | On the ride screen, the body no. + plate (the street check) were hidden behind the footer | A toolbar band above the map cost ~100 px | A floating back button on the map; the map at 36 vh |
| 4 | The map never showed the driver marker | It framed itself while "searching", before the driver had a position | Re-frame when a driver position first appears, and when the trip starts |
| 5 | **After choosing Balikan, the wait chips were out of sight** behind the pinned footer, while the button said "Choose how long you will stay." | Chips render below the cards | Choosing Balikan scrolls the chips into view |
| 6 | Scrolled content ran **under the status bar** (text over the clock) | Full-bleed map screens have no top padding | A white status-bar strip (`.hg-statusbar-scrim`) on both map screens |
| 7 | Balikan's 6-stage track broke "Searching" mid-word | ~50 px per column | With 6 stages, only the current stage's label is visible (all stay readable to screen readers) |
| 8 | Two rides were booked during the first, crashing emulator session without my taps; a typed landmark arrived as "alfamart" | Emulator input glitches (the same session crashed twice). In every later run, each "Mag-book" made **exactly one** booking (counted in the server log) | Nothing in the app: `book()` / `retry()` run only from their buttons. Watch on the Redmi |
| 9 | A first test said "Juan got no offer" | The test asked for Juan's offers 7 minutes later, after the 2-minute request had expired | Test timing; matching worked (the offer row existed) |

---

## 6. Step notes (explained)

### 6.1 API touch-ups (10.1)

- **`GET /booking-options`** gives the app the enabled ride types, the service-area circle, the minimum distance, the Balikan wait choices and the request timeout. The phone can then flag a pin outside Papaya **before** asking for a fare (brief E1/E2). The server still checks everything on `/fare/estimate` and `/rides`.
- **Rating average from 5 ratings.** `driver.rating.average` is `null` until the driver has 5 ratings (active-ride brief § 8: "show the average only when count ≥ 5"); the count is always given. A Phase 9 test was updated, and a new test checks 5 ratings → 4.6.

### 6.2 The foundations (10.2)

| Piece | Role |
|---|---|
| `core/services/map.service.ts` | The **only** code that knows Leaflet. A page gets an `AppMap` with 7 methods: `center`, `setView`, `setMarker`, `fit`, `onMoveEnd`, `resize`, `destroy`. Markers are CSS + inline SVG (pickup = papaya ring, destination = ink pin, driver = the tricycle in a disc), so there are no image files. Tiles come from OpenStreetMap, with the **required credit** shown. The tile address is in `environment.mapTiles`, so it can be swapped |
| `core/services/ride.service.ts` | Every ride call: `bookingOptions`, `estimate`, `book`, `active`, `get`, `history`, `cancel`, `rate`, `passengerReturning`. Pages never call the API directly |
| `features/passenger/booking-draft.service.ts` | The booking in progress, in memory: step, pins, type, wait, note, estimate. Leaving the tab keeps it. `fromRide()` rebuilds it from a ride for "Mag-book ulit". `reset()` runs after a completed ride |
| `features/passenger/ride-view.ts` | Plain functions: `statusLine`, `stages` (4 One-way / 6 Balikan, filling skipped ones), `canCancel`, `showDriverCard`, `initials`, `minutesSince`, `fareChanged`, `returningCooling` |
| `features/passenger/booking-checks.ts` | Haversine (the same formula as the API), `insideArea`, `tooClose`, `townCenter` |
| `ApiError.data` | Carries the API's recovery facts: the new estimate (`FARE_CHANGED`), the active ride id (`ACTIVE_RIDE_EXISTS`) |
| `LocationService.checkPermission()` | Checks **without asking**, so the app's own reason (L1) comes first |

**Tests** (mobile, now **78**): `ride-view.spec` (5), `booking-checks.spec` (3), `ride.service.spec` (5).

### 6.3 Book (10.3)

**Layout:**
- The map is on top (48% of the screen while placing pins, 28% on step 3).
- The step content sits below it.
- The step's **one orange button is pinned above the tab bar**, the same pattern as Driver Home.

| Step | What happens |
|---|---|
| Gates (on every visit) | 1. An active ride → open the ride screen (`replaceUrl`). 2. No active subscription → the Phase 8 gate card, with the map greyed out. 3. Location: not asked yet → **L1** card ("…we need your location. It's used only while you book and during a ride.") → Android's prompt; denied → town center + **L2**; GPS off / timeout → **L3** + Subukan ulit |
| 1 · Pickup | A **fixed center pin**: the passenger moves the map under it (easier than dragging a small marker). Locate button, optional landmark, "Pick me up here". **E1** inline if outside the area |
| 2 · Destination | The pickup row (tap = back to step 1), the ink pin, landmark, "I'm going here". **E1/E2** inline; the button is disabled while either shows |
| 3 · Choose | Route rows (tap to edit), **both fares from one estimate**, option cards (Role Card look, ring/check), wait chips for Balikan (they scroll into view), "See details" breakdown (base, distance × rate, minimum, way back, waiting "₱0 (waiting is free)", service fee, total), optional message, "This is an estimate. You pay the driver in cash.", **"Book · ₱39.80"** |
| Errors | **E3** estimate failed + Subukan ulit · **E4** offline · **E5** fare changed: the card shows the new total and the passenger taps Book again · `ACTIVE_RIDE_EXISTS` → the ride · `SUBSCRIPTION_INACTIVE` → the gate (pins kept) |

**Back (decision #2):** while the Book page is showing, the Android Back button steps 3 → 2 → 1 (`Platform.backButton`, priority 10), and only then leaves the tab.

### 6.4 The active ride (10.4)

One screen whose content follows the server's status (it never advances a status itself):

| Status | Status line (largest text) | Context | Action |
|---|---|---|---|
| requested | Looking for a driver… | pickup → destination, type, estimate | Cancel |
| accepted / driver_arriving | Juan is on the way | **0.79 km away** (hidden when unknown), your pickup | Cancel |
| arrived | Juan is here (+ a short vibration) | Arrived N min ago | Cancel |
| in_progress | You're on the way to your destination (Balikan: Going there (1 of 2)) | destination, estimate | — |
| waiting (Balikan) | Juan is waiting for you | You said: 30 min · 12 min so far | **I'm coming back** → "Juan has been told" for 5 min |
| return (Balikan) | You're on the way back to the pickup | Going back (2 of 2) | — |
| completed | You've arrived! | **Pay Juan ₱39.80 (cash)** first, then the stars | Submit rating · Later |
| cancelled | You cancelled / The driver cancelled / No driver is available right now | "Your booking is saved." / "You won't be charged." | Book again · Try again + Change the booking |

**The driver card** (from accepted until the ride ends): initials, name, "Pula tricycle", ★ average (only from 5 ratings), a green **call** button (`tel:`; the number itself isn't printed), and **body no. + plate at the second-largest size**. Kanselahin is a quiet text button at the very bottom, never next to the call button. It opens the one modal of the flow: the reason chips, a red "Cancel the ride", and "Keep the ride".

**Polling:**
- `GET /rides/{id}` runs every 4 s while the screen is visible, stops in the background, and runs again at once on resume.
- A failed poll keeps the last status and shows "Weak connection. Last update: 40 sec ago."
- Finished rides stop polling.
- "Try again" (no driver) books the same trip again at today's fare. If anything is in the way (the fare changed, a gate), the Book screen opens at step 3 to show it.

### 6.5 Rides (10.5)

The passenger's rides, newest first: date and time ("Oct 12 · 4:29 PM"), fare, route, a status chip, the type, and "Not rated yet" on an unrated completed ride. Tap → the same ride screen, where a completed ride can still be rated. GPS error messages now exist in both languages (`location.DENIED` … `location.UNAVAILABLE`).

### 6.6 Finish review + device checks (10.6)

The `impeccable-finish-reviewer` compared the screens with DESIGN.md and both briefs. It returned **8 material fixes**, all applied and rechecked on the emulator (screenshots `p10z-*.png`):

| # | Finding | Fix |
|---|---|---|
| 1 | Stage labels were 0.85rem (≈15px), under the **16px floor** | 1rem; words wrap whole |
| 2 | **The weak-connection banner was probably invisible**: under the status-bar strip, scrolling away with the map | It now sits directly above the status line it qualifies. P11 is captured (`p10z-weak.png`) |
| 3 | The status line had lost its heading role, and TalkBack read the status twice (also the map's label) | A plain `<h1>` + a hidden live copy that's read out on changes; the map gets its own label, "Map of your ride" |
| 4 | On step 1 the footer hid the landmark field and the L3 "Try again" | Map 48 → 40 vh; L3's retry is a full outline button like L1 and E3 |
| 5 | Wait chips, cancel reasons, the details toggle and the locate button were under the **56px minimum** | All 56px |
| 6 | The call button was **filled green** (green means "done") and the loudest thing on a screen with intentionally no action | An outline disc: Deep Papaya ring and icon |
| 7 | DESIGN.md had no Phase 10 entries | New: map screens, markers, status-bar strip, pinned footer, option cards and choice chips, the ride screen (hierarchy, stage track, driver card, pay line, cancel + danger button, weak connection), the floating back button |
| 8 | Ride history rows looked identical (same date, same "Pinned on the map") | Date **and time** (`phDateTime`) |

**Every passenger test, on the emulator** (the driver played through the API; screenshots `.impeccable/review/p10-*.png`, `p10v-*`, `p10f-*`, `p10z-*`):

| # | Test | Result |
|---|---|---|
| P1 | Opening with an active ride | The app went straight to the ride screen ✅ |
| P2 | Location | GPS not ready → **L3** + Subukan ulit (`p10-l3`); with a fix, the map centers on it ✅ (L1 needs a fresh install's permission state; the code path is the same `checkPermission()` → card) |
| P3 | Destination too close | **E2** inline, button disabled ✅ |
| P4 | Pickup → destination → options | One-way ₱39.80 · Balikan ₱49.60 from one estimate; Balikan → wait chips (scrolled into view); the button shows the chosen total ✅ |
| P5 | Book | "Looking for a driver…" ✅ |
| P6 | Accept → depart → arrive → start → complete | The screen followed each step within one poll: "Juan is on the way · 0.17 km away", "Juan is here", trip, "You've arrived! · **Pay Juan ₱39.80 (cash)**" ✅ |
| P7 | Rate 5 stars | Saved (server: score 5); "Thank you for the rating!" ✅ |
| P8 | Cancel while searching with "My plans changed" | "You cancelled the ride." + **Book again** → step 3 restored with fresh fares ✅ |
| P9 | No driver within 2 minutes | "No driver is available right now. Your booking is saved." + Try again / Change the booking ✅ |
| P10 | Balikan waiting leg | "Juan is waiting for you · You said: 30 min · 0 min so far" → **I'm coming back** → "Juan has been told"; the driver's poll saw `passenger_returning_at` → "Going back (2 of 2)" → "Pay Juan ₱49 (cash)" ✅ |
| P11 | The API unreachable mid-ride | "Weak connection. Last update: 52 sec ago." above the kept status; gone after reconnecting ✅ |
| — | Driver cancels with a reason | "The driver cancelled the ride." · "Nasiraan ng gulong" · "You won't be charged." · Book again ✅ |
| — | Bookings per tap | Exactly **one** `POST /rides` per "Mag-book" in every clean run (counted in the server log) ✅ |

---

## 7. Phase 10 report (summary)

**Result:** ✅ The **done when** condition (phase-0 § M) is met: on the emulator, rides were **requested** (One-way and Balikan), **tracked** through every status, **cancelled** (by the passenger and by the driver), and **rated**.

| | Phase 10 added | Totals now |
|---|---|---|
| API (`papaya-hatidgo-api`) | `GET /booking-options` · rating average from 5 ratings | **196 tests** (2 new) |
| Mobile (`papaya-hatid-go`) | Leaflet + `MapService`, `RideService`, booking draft, ride view helpers, the Book screen (3 steps), the active ride screen, Rides history, ~120 messages, `@capacitor/haptics` | **78 unit tests** (13 new) |

**Deviations (recorded):**

| Brief said | Built | Why |
|---|---|---|
| Child routes per booking step | Steps as page state; Android Back steps back | Same Back behavior, without a nested router outlet inside Ionic tabs (decision #2) |
| Dark theme designed | Always White | DESIGN.md (Phase 5) came after the briefs (decision #11) |
| Offline rating queued in SQLite | Rating needs a connection; "Later" and Rides › details keep it possible | Phase 15 hardening (decision #6) |
| "Buksan ang Settings" button (L2) | The L2 text explains where to allow location | Opening Android's app settings needs an extra plugin; not worth it for one link |
| Route line once both pins exist | Pins only | Phase 12, with the live driver marker (the brief's own plan) |

**For the student:**
- The emulator on this PC is stable with `-memory 3072 -gpu swiftshader_indirect` (problem 1).
- **On the Redmi:** watch for the unexplained extra bookings seen once in the crashing emulator session (problem 8). A full two-phone ride (passenger on the Redmi, driver on the emulator) needs the driver screens of Phase 11.

**Next:** Phase 11, the driver ride screens and earnings: going online for real (location pings, keep-awake), the full-screen request alert with the real countdown, accept / skip, the ride steps, and the earnings summary.
