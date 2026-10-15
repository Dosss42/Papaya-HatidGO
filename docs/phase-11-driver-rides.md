# Phase 11 — Driver ride screens + earnings

**Goal:**
- A verified, subscribed driver goes online with one tap, and the screen stays on.
- The phone reports its position at the agreed cadence.
- A request **interrupts**: full screen, a tone and vibration, the real countdown, and the facts needed to decide.
- The driver accepts or skips, drives the ride step by step, collects the cash, and sees the day's earnings.

**Done when (phase-0 § M):** a full ride on two devices.

**Rules come from:**
- The confirmed brief [driver-home](design-briefs/driver-home.md).
- [active-ride](design-briefs/active-ride.md), mirrored for the driver.
- [DESIGN.md](../DESIGN.md).
- [phase-9-rides.md](phase-9-rides.md): the API.
- phase-0 § I: location cadence.

## 1. What already exists

| Piece | From |
|---|---|
| Every driver ride endpoint: offers, accept / decline, transitions, cancel, trail, idle location, availability with position | Phase 9 |
| The go-online gate (`PATCH /drivers/me/availability`, 403 + checklist) | Phase 8 |
| Driver Home checklist (Phase 7) and its "ready" state with a disabled "Go online" | Phases 7–8 |
| `MapService`, `LocationService`, `AppLifecycleService`, `NetworkService`, Haptics, the ride-screen design (DESIGN.md "The ride screen") | Phases 3, 10 |

## 2. Implementation steps

| Step | Task |
|---|---|
| 11.1 | API: `GET /drivers/me/earnings?period=day\|week\|month` (Philippine calendar) · offers list says whether the server still has the driver online (`meta.is_online`) · tests |
| 11.2 | Mobile foundations: `DriverRideService` (availability, offers, accept / decline, transitions, earnings, history) · `DriverLocationService` (one GPS watch; **idle**: every 60 s or 100 m → `/drivers/me/location`; **ride**: every 10 s → `/rides/{id}/locations`) · `@capacitor-community/keep-awake` · the request tone (generated, bundled) · `driver-ride-view.ts` |
| 11.3 | **Driver Home**: offline / going online / online (compact low-cost map, today's earnings, screen-on tip, Mag-offline) · forced offline · no internet / GPS lost · active ride → ride screen. Not ready → the Phase 7 checklist as before |
| 11.4 | **Incoming request**: full-screen takeover, tone + vibration every ~5 s, real countdown, One-way / Balikan, fare, Sundo / Hatid with landmarks, note, Laktawan / Tanggapin, "Nakuha na ng ibang driver." / "Wala na ang request na ito.", "+1 pang request" |
| 11.5 | **Driver active ride** `/driver/ride/:id`: status line, passenger card (first name + call), the one next step per status, Balikan legs + "Pabalik na ang pasahero", end at destination, cancel with reason, "Kolektahin ang ₱… (cash)" · **Rides** history · **Earnings** tab (today / week / month) |
| 11.6 | Finish review · **two-device ride** (driver on the emulator, passenger on the phone or the second client) · report · commit |

## 3. Decisions

The student asked for the phase straight through. The briefs' open decisions keep their defaults.

| # | Decision | Why |
|---|---|---|
| 1 | The **driver active ride** screen (whose brief was never written) mirrors the passenger's: one screen following the server's status, status line first, **one primary button = the next step** ("Papunta na ako" → "Nandito na ako" → "Simulan ang biyahe" → … → "Tapusin ang biyahe"), the passenger card with call, cancel as a quiet text button | The same structure the student approved for passengers; one obvious next step for a driver on the road |
| 2 | Home shows **Offline / Online** only when the driver is ready (verified + subscribed); otherwise the Phase 7 checklist stays | Brief: "Unverified or ineligible drivers see the checklist" |
| 3 | The request tone is a short **generated** two-note chime bundled as a WAV, played at media volume, repeated every 5 s with a vibration until the driver acts or the request ends | Brief § 7 "a short, distinct tone bundled with the app; works without network"; generated = no licence questions |
| 4 | **One GPS watch** (`DriverLocationService`): while online it sends at most every 60 s, sooner after 100 m; during a ride every 10 s to the trail (which also moves the driver for the passenger) | phase-0 § I cadence; one watch, no double battery use |
| 5 | The compact map follows the brief's cheap rules (moves only on a send, re-centers only off-screen or on "Nasaan ako?", no map while offline) **without** a dark style | DESIGN.md Always White (as in Phase 10) |
| 6 | The volume tip is **always shown** while online, quietly, next to the screen-on tip | Reading the media volume needs a native plugin; the tip costs nothing |
| 7 | The offers poll carries the server's `is_online`: if the server switched the driver off (stale location, documents or subscription expired), the app shows "Na-offline ka: {reason}" with the checklist's reason | Brief § 5: never look online when the server has stopped matching |
| 8 | Earnings = the **final totals of completed rides**, by Philippine calendar day / Monday–Sunday week / month; cash only (no deductions exist) | Brief § 3.1 "cash from completed rides" |

**Decisions added during the build** (also taken without asking, as the student requested):

| # | Decision | Why |
|---|---|---|
| 9 | Home tells the server **"offline" once per app start** (`syncOffline`) | Android killed the app while Google Maps was open (problem 2). Without this, the server kept matching the driver for up to 3 minutes with requests nobody saw |
| 10 | The offers list returns `meta.server_now`, and the app counts down on the **server's clock** | A budget phone with a wrong clock would either hide live requests or count past the real expiry (finish review #4) |
| 11 | On the driver's ride screen, **where to go** (Sundo / Hatid + Directions) comes before the passenger card. There's no back arrow while the ride is active | On the road the place matters most, and Home's resume rule would bounce Back straight back (finish review #5, #6) |
| 12 | After each ride step, the next button **ignores taps for 1.2 s** | The next step's button appears under the same finger: a double tap must never skip a step |
| 13 | The takeover's "Hatid" line shows the **trip distance** ("Hatid: 2.2 km na biyahe") + the landmark, not an area name | There's no geocoding (no area names) in the MVP; the landmark carries the place |

## 4. Test plan (summary)

| # | Test | Expected |
|---|---|---|
| D1 | A ready driver opens Home | "Offline ka." · today's ₱ · Mag-online |
| D2 | Mag-online | Nag-o-online… → GPS fix → server check → "● Online ka" + map + screen stays on |
| D3 | Not eligible (e.g. no subscription) | The server's reason + the next step; stays offline |
| D4 | A passenger books nearby | Full-screen request within ~5 s, tone + vibration, countdown, fare, Sundo / Hatid |
| D5 | Laktawan | Closes; the next nearest driver gets it |
| D6 | Another driver takes it first | "Nakuha na ng ibang driver." closes after 3 s |
| D7 | Tanggapin → the ride steps → Tapusin | Each step updates the passenger's screen; "Kolektahin ang ₱… (cash)" |
| D8 | Balikan | Legs + "Pabalik na ang pasahero" when the passenger taps it |
| D9 | Driver cancels with a reason | The passenger sees it |
| D10 | Earnings | Today's total and count include the ride |
| D11 | Server switches the driver off (stale) | "Na-offline ka" |

---

## 5. Implementation log

| Step | Result |
|---|---|
| 11.1 | API: `GET /drivers/me/earnings?period=day\|week\|month` on the Philippine calendar. The offers list adds `meta.is_online` and `meta.server_now`. `EarningsTest` (4 tests). API **200 tests** ✅ |
| 11.2 | `DriverRideService`, `DriverLocationService` (one watch, two cadences, heartbeats), `DriverShiftService` (offline → going → online → ride), `RequestAlertService` (tone + vibration), `driver-ride-view.ts`. Keep-awake 8.0.1 installed; the tone generated by `scripts/make-request-tone.js` ✅ |
| 11.3 | Driver Home: the work view when ready (offline / going / online + compact map, today card, tips, banners, forced offline). The Phase 7 checklist otherwise ✅ |
| 11.4 | `RequestAlertComponent`, hosted in the driver tabs page, so a request interrupts any tab ✅ |
| 11.5 | `/driver/ride/:id`, the Rides history, the Earnings tab (day / week / month). The passenger page translates the driver's reason codes ✅ |
| 11.6 | Unit tests **101** (23 new) ✅ · finish review: 8 fixes, all applied ✅ · D1–D11 on the emulator with a second client ✅ |

### Problems found

| # | Problem | Cause | Fix |
|---|---|---|---|
| 1 | Two shift tests timed out | The test awaited `poll()` before answering the HTTP request that `poll()` was waiting for | Start the poll, answer, then await |
| 2 | Mid-ride, three steps were recorded within 8 s while the screen was blank, and Home said "offline" while the server said online | Tapping **Directions** opened Google Maps, and Android **killed the app** (low memory on the emulator, also possible on cheap phones). The steps were not reproduced in a careful rerun with one tap per check; the likely cause was taps that landed on stale positions while the screen was redrawing | (a) The app now resumes the ride from Home after a restart (it did); (b) decision 9: tell the server "offline" on start; (c) decision 12: a 1.2 s step guard. A careful rerun gave exactly one server change per tap (rides 14 and 20) |
| 3 | The route map zoomed out too far, with the destination pin hidden | DevTools on the WebView showed it: the map is ~240 px tall, starts at the very top of the screen, and the fit's 48 px padding put the pin under the status bar and the back button | `rideMapInset()` measures what floats over the map, and `fit()` pads by it. This also fixes the passenger's ride screen |
| 4 | The test helper's booking looked successful on an `ACTIVE_RIDE_EXISTS` error | The error answer also has a `data` field | Check `data.id` (test script only) |
| 5 | The status bar sat on the online Home map | No white strip behind it | `hg-statusbar-scrim` while the map shows |

---

## 6. Step notes (explained)

### 6.1 Why one service owns the "work state" (`DriverShiftService`)
Home, the request takeover and the ride screen all need to know the same few things: offline, going online, online, or on a ride, plus which request is on screen. If each page kept its own copy, they could disagree; for example, Home could say "online" while the ride screen has stopped the offers. So one root service owns the state as **signals**, and pages only read it and call its actions: `goOnline`, `goOffline`, `skip`, `accept`, `startRide`, `rideEnded`. The rule that matters most is in its comment: *the app is never online on its own*. Every online moment is one the server confirmed (the PATCH answered OK, and every offers poll says `is_online: true`).

### 6.2 Going online, step by step (brief § 3.2)
1. **The tap unlocks the sound.** Android WebViews only play audio that a user gesture started, so the tone is played once silently inside the Mag-online tap. Later it can ring by itself.
2. **Permission, then a real fix.** `checkPermission()` tells Home whether to show "To get passengers near you, we need your location." while the system asks. `getCurrentPosition()` gives up after 10 s.
3. **The server decides.** `PATCH /drivers/me/availability` with the position. A 403 `NOT_ELIGIBLE` carries the checklist. `offlineReason()` turns its **first failed check** into a sentence and a button (e.g. "Your subscription has ended." + Renew).
4. **Online:** keep-awake on, the idle location starts, and the offers poll runs every 5 s.

After every `await` the service checks that it is still "going". A logout during those seconds must not leave a GPS watch and a poll running with no session (finish review #8).

### 6.3 The location cadence (`DriverLocationService`)
There is **one** GPS watch with two ways of sending:
- **Idle (online, waiting):** a point is sent only if 60 s have passed or the driver moved ≥ 100 m (`distanceKm`, the same Haversine as booking). This keeps the server's 3-minute stale rule satisfied without wasting data.
- **Ride:** points are collected, and every 10 s the batch goes to `/rides/{id}/locations`. The newest point is also what the passenger sees as the driver's position.

**Heartbeats:** a phone lying still may get *no* watch updates at all (the emulator never does). So idle mode takes a fresh fix once a minute, and ride mode does so after 30 s of silence. Otherwise a parked driver would be switched off by the server while honestly waiting.

**Signals back to the shift:** `serverOffline` (409 `NOT_ONLINE`) → forced offline. `rideOver` (409 `INVALID_TRANSITION` on the trail) → back to waiting, even if no ride screen is open (finish review #1).

### 6.4 The request takeover
- It is **hosted in the tabs page**, not in Home, so it interrupts whichever tab is open.
- **Nearest pickup first** (`byNearest`), with "+1 more" counting the rest.
- The countdown uses the **server's clock** (`shift.now()` = phone time + the offset measured from `meta.server_now`, decision 10).
- **Outcomes, honestly:**
  - "Another driver took it." comes from the accept's 409 `RIDE_TAKEN`.
  - "This request is no longer available." means the offer vanished from the poll, expired on screen, or got `OFFER_GONE`.
  - Both stay for 3 s, then the next request shows (or the screen closes).
- **A lost answer:** if the accept timed out but the server *did* give the ride to this driver, `claimIfMine()` asks `GET /rides/active` and opens the ride instead of saying "gone" (finish review #2).
- **System Back = Skip**, never Accept, and Back can't close it during "Accepting…" (`canDismiss`).

### 6.5 The driver's ride screen
`nextStep()` maps each status to **one** button: accepted → "I'm on my way" → "I'm here" → "Start the trip" → (Balikan: "We're at the destination" → waiting → "We're heading back") → "Finish the ride". The screen never advances a status by itself; it shows whatever the API returned, and the poll catches what the passenger did (cancel, "Pabalik na ako").
- **Driver cancel:** a reason is required, sent as a stable code (`vehicle_problem`, …). Each side reads it in its own language (`driverReasonKey`); older free-text reasons are shown as written.
- **End here** (Balikan, waiting): the confirm sheet says what is paid (the trip there + the waiting, no way back).
- **Collect ₱… (cash):** the final fare from the server, in the pay-line style.

### 6.6 Earnings
`GET /drivers/me/earnings` adds up `final_total` of completed rides whose `completed_at` falls in the period, with the period's start and end computed in **Asia/Manila** and compared in UTC. A ride finished at 00:30 in Manila (16:30 UTC the day before) counts for the new day, which a test proves. Home shows the day's total and the Earnings tab all three periods. While the number hasn't loaded, Home shows "Today: —", never ₱0.

### 6.7 Finish review (11.6)
The `impeccable-finish-reviewer` returned **8 material fixes**, all applied:

| # | Finding | Fix |
|---|---|---|
| 1 | A ride ended while the driver was on another tab left the shift "on a ride" forever (no offers) | Home's resume check calls `rideEnded()` when there's no active ride; the trail's 409 signals `rideOver` |
| 2 | A timed-out accept that the server granted showed "gone" | `claimIfMine()` checks `GET /rides/active` first |
| 3 | Back during "Accepting…" stranded the request (and blocked others) | `canDismiss` while accepting |
| 4 | Expiry judged on the phone's clock | `meta.server_now` + clock offset (decision 10) |
| 5 | Directions hidden under the footer before the trip | Place before the card, the map at 30vh, no double safe-area padding |
| 6 | Back on an active ride bounced off Home | No back arrow while active; Home replaces itself in the history |
| 7 | "Today: ₱0 · 0 rides" shown when the total never loaded | "Today: —" |
| 8 | Logout during "Going online…" could still go online; keep-awake stayed on after logout mid-ride | State checks after each await; `allowSleep()` always on reset |

---

## 7. Tests

**Unit tests (mobile 101, 23 new):** `driver-ride-view.spec` (next step per status, lines, cancel / end rules, heading, reason codes, countdown, nearest first, offline reasons), `driver-shift.service.spec` (online with a real fix, NOT_ELIGIBLE reason + link, no GPS = no request, nearest first + tone, skip, taken, gone, accept → ride, forced offline, a lost accept answer, the server clock, Mag-offline), `driver-location.service.spec` (100 m rule, NOT_ONLINE, the trail instead of pings), and the Earnings page.

**API (200, 4 new):** `EarningsTest`: day / week / month on the Philippine calendar, the midnight boundary, only own completed rides, passengers 403, `meta.is_online` after `drivers:offline-stale`, and `meta.server_now`.

**Live, two clients:** Juan (driver) on the emulator app; Maria (passenger) and Pedro (second driver) through the API from a script. Screenshots: `.impeccable/review/p11-*.png`.

| # | Test | Result |
|---|---|---|
| D1 | A ready driver opens Home | "You're offline." · "Go online to get passengers near you." · today's ₱ · Go online ✅ |
| D2 | Go online | Online with the compact map and the tips; the server has `is_online` with a fresh position ✅ |
| D3 | Not eligible | Unit-tested (the server's reason + Renew); the live driver is eligible ✅ |
| D4 | Maria books nearby | Full-screen request within one poll: "New passenger!", countdown 1:52, One-way, ₱51.70, Pickup 0.1 km "Harap ng munisipyo", Drop-off 2.2 km "Palengke", her note ✅ |
| D5 | Skip | Closes; the server has Juan `declined`, Pedro `offered` ✅ |
| D6 | Pedro accepts first | "This request is no longer available." then closes after ~3 s ✅ ("taken" via the accept's 409 is unit-tested) |
| D7 | Accept → steps → Finish | Each tap = exactly one server change (ride 14 / 20); Maria saw accepted → driver_arriving → arrived → in_progress → completed; "Collect ₱51.70 (cash)" ✅ |
| D8 | Balikan (30 min) | "Balikan · wait 30 min ₱73.40" → … → "Waiting for Maria · They said: 30 min" → Maria taps returning → "**Maria is coming back!**" → "We're heading back" → "Collect ₱73.40 (cash)" ✅ |
| D9 | Driver cancels "Tricycle problem" | Server: `by=driver reason=vehicle_problem`; the driver sees "You cancelled the ride." + the reason; the passenger page translates the code ✅ |
| D10 | Earnings | Home "Today: ₱228.50 · 4 rides"; the Earnings tab: Today ₱228.50 · 4, This week ₱317.30 · 6, the list with times ✅ |
| D11 | The server switches the driver off (stale) | "You were taken offline. We didn't get your location for a while. Go online again when you're ready." ✅ |

---

## 8. Phase 11 report (summary)

**Result:** ✅ The **done when** condition is met: **a full ride on two clients**. The driver app on the emulator and the passenger through the API drove One-way and Balikan rides to "Collect ₱…", plus skip, taken, and cancel.

| | Phase 11 added | Totals now |
|---|---|---|
| API (`papaya-hatidgo-api`) | `GET /drivers/me/earnings` · offers `meta.is_online` + `meta.server_now` | **200 tests** (4 new) |
| Mobile (`papaya-hatid-go`) | Shift, location, alert and driver-ride services; the Driver Home work view; the request takeover; the driver ride screen; Rides + Earnings tabs; the bundled tone; keep-awake; ~85 messages (en + fil); `rideMapInset` (also fixes the passenger map) | **101 unit tests** (23 new) |

**Deviations (recorded):** Always White instead of a dark map (decision 5) · the volume tip always shown (decision 6) · "Hatid: {km}" instead of an area name (decision 13).

**For the student:**
- **Two phones:** install the new APK on the Redmi, log in as a passenger there, and keep Juan on the emulator. The phone reaches the PC's API only with `adb reverse tcp:8000 tcp:8000` over USB, or with the PC's LAN address in `environment.ts`.
- **Real sound check:** on the emulator the tone can't be heard from here. On the Redmi, check that the chime is audible at media volume with the screen on.
- The one ESLint error (`register.page.ts:54`, input alias) is from before Phase 11 and was left as is.

**Next:** Phase 12, maps: the live driver marker moving smoothly and a route line on both ride screens.
