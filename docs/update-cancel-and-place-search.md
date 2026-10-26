# Update — Passenger cancel window, place search and the pickup's name

Asked by the student after Phase 13 (2026-10-26):
1. "When the driver taps *On my way*, the passenger cannot cancel."
2. "When I search a place, it can detect where he picks me up."

## 1. Decisions (the student chose both recommended options)

| # | Decision | Why |
|---|---|---|
| 1 | Once the driver taps **On my way**, the passenger's Cancel disappears. It comes back if the driver **still hasn't arrived after 10 minutes**. The admin can change the 10 (1–60) in Fares & settings. Once the driver has **arrived**, the passenger can't cancel in the app; the driver can still cancel a passenger who doesn't show up | Protects the driver's trip, but a passenger is never trapped by a driver who doesn't come |
| 2 | A **place search** on Book (steps 1 and 2) and an **automatic name** for the pin's spot ("street, barangay"), both from **MapTiler Geocoding** with the same key as the map (free up to 100,000 requests a month) | The driver sees where to pick up without the passenger typing it; the passenger can still change the name |

## 2. What changed

| Part | Change |
|---|---|
| API | `RideService::passengerCancelWindow()` and the check in `cancel()`: `409 CANCEL_LOCKED` with the time it opens. The setting `ride.passenger_cancel_after_minutes` (default 10; migration for existing databases, seeder, admin range 1–60). The ride sent to the passenger has `passenger_cancel: {allowed, opens_at}`. Messages in English and Taglish |
| Admin website | The new setting in Fares & settings → Matching |
| Mobile, ride screen | Cancel follows the server's answer. While the driver is on the way: "Your driver is on the way. You can cancel at 3:52 PM if they haven't arrived." When it opens because the driver is late, the sheet starts on "The driver is taking long" |
| Mobile, Book | "Search a place" box (from 3 letters, 0.4 s after typing stops): results only inside the service area. Choosing one moves the map there and uses its name. When the map stops, the pin's spot is named automatically ("Named from the map. You can change it."), until the passenger types their own landmark |

## 3. What the real map taught us

| Found | Fix |
|---|---|
| "public market" found Calamba and Baguio first: MapTiler's "near here" is only a preference | The search is limited to the **box around the service area**, then to the circle |
| At the town center, the nearest "name" was only a postal code: "3104, Philippines" | The automatic name uses only **streets and barangays/places**, never postal codes |
| The nearest landmark (POI) can be a joke someone typed into OpenStreetMap | Landmarks are not used for the automatic name (the search can still find real ones) |
| Generic words ("palengke", "market") find nothing in General Tinio: the map has few named places there | Search works with real names (barangays, streets, the town); typing the landmark is always possible |

## 4. Tests

| Kind | Result |
|---|---|
| API | **245 tests** (2 new: the window opens 10 minutes after "On my way", `CANCEL_LOCKED` with the time; the admin's minutes apply, no passenger cancel once arrived, the driver can still cancel a no-show; RIDE-06 updated to the new rule) |
| Mobile unit | **126 tests** (the cancel window, the names: "street, barangay", no postal codes, the search box around the area) |
| Emulator (real MapTiler, real API) | GPS pin named "San Pedro, General Tinio" ✅ · search "poblacion" → barangays of General Tinio and Peñaranda ✅ · choosing "Poblacion Central" moved the map and kept that name ✅ · destination named after moving the map ✅ · the names saved on the ride (the driver sees them) ✅ · driver on the way → Cancel hidden, "You can cancel at 11:04 PM…" ✅ · driver late → Cancel back, "The driver is taking long" chosen, cancelled with reason `driver_late` ✅ |

Captures: `.impeccable/review/p13x-*.png`.

---

## 5. Fares and the map along the real roads (2026-10-27)

**The problem (the student):** "the line is straight and doesn't calculate the real way; the fare is too low." The fare used the straight-line distance, and real roads are usually 20–50% longer.

**Decision:** the student first chose OpenRouteService (it needs an account and a key), then preferred to avoid that. So the server uses **OSRM**: a free routing server on OpenStreetMap roads (the same data as the map tiles), with **no account and no key**. OpenRouteService still works if a key is ever put in `.env` (`OPENROUTESERVICE_KEY`).

| What | How |
|---|---|
| Where | On the SERVER (`RoutingService`), for both the estimate and the booking: the fare never comes from the phone |
| Same fare twice | Each trip's route is kept for a day, so the booking a minute later uses the same road and never says "the fare changed" by itself |
| Saved | The road line is saved on the ride (`route_points`, thinned to ≤ 300 points) and drawn on both phones |
| Map | Step 2: straight while the destination pin moves (no request per move). Step 3 and the ride screens: the road |
| Fallback | OSRM unreachable or no road found: the straight line × **1.3** (a typical detour in a town), saved as `distance_by_road = false`. Booking never stops |
| Fair use | OSRM's public server asks for light use (about 1 request a second); one cached route per trip is far below that. For a real launch, run your own OSRM or use a keyed service |

**Measured (General Tinio):** Poblacion Central → a spot 4.7 km away in a straight line = **5.69 km by road** (+21%). On the booking screen, the line runs through town and along the river road to Concepcion.

**Tests:** API **249** (4 routing tests with a faked OSRM / OpenRouteService: road distance and line, one shared route, the fallback, thinning); app **127** (the road line rule). Capture: `.impeccable/review/p13x-07-road.png`.

---

**For the student:** in MapTiler's dashboard, restrict the key to your app and admin site before release (it's visible inside the APK, like any map key).

---

## 6. Hybrid dispatch: the request board and auto-accept (2026-10-27)

**The problem (the student):** a passenger farther than 3 km from every driver got no driver at all, and drivers couldn't see or choose rides themselves. "Show the passengers so the driver can choose… and a button that auto-accepts within 2–5 km, like other platforms."

**Decision (the student chose both recommended options):** a **hybrid**, as many platforms do:

| Part | How it works |
|---|---|
| **Ringing alert** (kept, Phase 11) | The nearest drivers within **3 km** get the full-screen alert with the tone, as before (admin: "Ringing alert for drivers within") |
| **Request board** (new) | Every online driver sees **open requests within 5 km** on Home, nearest first: fare, ride type, pickup landmark, "Pickup: 4.0 km from you · Drop-off: 3.5 km trip". Tapping one opens the same request screen (no tone) to Accept or Skip (admin: "Drivers see open requests within", 1–20 km) |
| **Auto-accept** (new, off by default) | The driver picks Off / 2 / 3 / 5 km on Home. A request whose pickup is that near is accepted for them at once and the ride opens. The choice is saved on the phone |

**Rules kept:**
- **One winner:** accepting from the board uses the same race-safe accept. A second driver gets "Another driver took it", and the ride leaves everyone's board.
- **Nothing personal before accepting:** the passenger's name and phone only after accepting, as with the alert.
- **Who sees the board:** only drivers who are online, located in the last 3 minutes, verified, with a verified tricycle and no ride now. Accepting re-checks everything, including the subscription.
- **Skipping a board request** only hides it for that driver (there was no offer to decline).

**Emulator check (real API):**
- Juan online; Maria booked a pickup **4 km** away: no alert (outside 3 km), and the request appeared on Juan's board (₱65.30, "Pickup: 4.0 km from you · Drop-off: 3.5 km trip", by road).
- Tapping it opened the request screen; Accept gave Juan the ride. ✅
- With auto-accept at **5 km**, Maria's next booking 4 km away was accepted by itself, and the ride screen opened. ✅

Captures: `p13x-08-board.png`, `p13x-09-board-takeover.png`, `p13x-10-auto-accepted.png`.

**Tests:** API **253** (4 new: the board at 4 km without an alert; choosing accepts it and only one driver wins; beyond reach neither shown nor accepted, and the admin can widen it; offline or busy drivers see no board. The Phase 9 test "not offered to you" now applies beyond the board's reach). App **130** (3 new: board listed without the tone and skipped without a decline; auto-accept takes the nearest request within the radius only; off = nothing by itself).

### 6b. List only: no automatic popup (the student, same day)

**The student:** "Why does it still pop up by itself? Better to show all the passengers who booked, and the driver has the option to take one."

**Change:** no request opens on the driver's screen by itself any more, however close. Every new request joins **Requests near you** on Home (nearest first), with **one short ring + vibration** (once per request, never repeating). The request screen opens only when the driver **taps** a request, or by **auto-accept** if the driver turned it on.

| Before (Phase 11 + 6) | Now |
|---|---|
| Drivers within 3 km: full-screen request, ringing every 5 s | Everyone: the list; one ring when a new request arrives |
| Skip → the next request popped up | Skip → back to the list |
| "Taken" / "gone" → the next request popped up | "Taken" / "gone" for 3 s → back to the list |

The server is unchanged: drivers within 3 km still get the push notification ("New ride request") when the app is in the background. Admin label: "Drivers notified first (push + ring) within".

**Emulator check:** Maria booked **0.3 km** from Juan: no popup; the request appeared in the list with one ring (`p13x-11-list-only.png`). **Tests:** app **130** (the Phase 11 request tests now choose from the list first; new: rings once, never opens by itself).

### 6c. The whole town on the list (the student, same day)

**The student:** "The driver far away in Papaya can't see it." A booking in the town center was 8.2 km from a driver at the town's northern edge, beyond the 5 km list.

**Change:** the list now reaches **the whole service area by default**: every online driver in town sees every booking, nearest first (setting `matching.board_radius_km` = **0**; a migration changed the existing 5 to 0). The admin can still limit it to a distance ("Drivers see open requests within (0 = the whole service area)", 0–50 km).

**Emulator check:** Juan at the northern edge saw the student's own booking in Poblacion Central and a test booking in the center, both "Pickup: 8.2 km from you" (`p13x-12-whole-town.png`). **Tests:** API **254** (new: a driver ~7.8 km away sees and accepts by default; the 5 km limit still works when the admin sets it).

### 6d. Redesign for many bookings (the student, same day)

**The student:** "If there are many bookings it only shows the nearest… show all the bookings, even far. Adjust the auto-accept button, then the list."

| Before | Now |
|---|---|
| The server sent at most 20 requests | **Every** open request in the service area, nearest first (requests only live ~2 minutes, so the list stays short) |
| Four big auto-accept chips | **One row**: "⚡ Auto-accept · Off ›" → a sheet: "Off: I choose myself" / Within 2 / 3 / 5 km (like the language sheet: check + tinted row on the current choice) |
| One big card per request | **Compact rows** (≥ 64px, split by Hairline): the pickup place over "3.9 km away · 4.1 km trip" on the left, the fare and the ride type on the right; header "Requests near you (n) · Nearest first" |

**Emulator check:** two bookings across town showed as two rows (3.9 km and 8.2 km away); the sheet opened from the row (`p13x-13-board-redesign.png`, `p13x-14-auto-sheet.png`). **Tests:** API 254, app 130.

## 7. Admin fare and settings changes reach the app (2026-10-27)

**The report:** waiting-fee changes saved in the admin did not show in the app.

**What was checked:** every fee field and every setting in Fares & settings, from the admin form to the database to the API.
- The server was right. Each estimate reads the newest fare row, and each setting is read fresh on every request.
- A Balikan stay of 30 min, with 10 free minutes at ₱2/min, costs ₱40 (new test in `AdminWebApiTest`).

**Why the app looked stale:**
1. **The saved fare itself.** It had 50 free minutes and ₱0.00 per minute. The stay choices are 15, 30 and 60 min, so the waiting fee came out ₱0 every time, and the app said "waiting is free".
2. **Booking options were loaded once.** The booking screen fetched them (ride types, service area, shortest trip) only the first time it opened. They now load on every visit to Book. If that check fails, the last answer is kept.
3. **A kept fare was never re-priced.** A booking left at step 3 kept the fare it was first priced with. Step 3 now asks for the fare again on every visit.
4. **The chosen stay could get lost.** It was sent only when Balikan was already the chosen card. It is now always sent, and one-way ignores it.

**Now visible in the app:** the price details show the admin's waiting rule under "Waiting", for example "First 10 min free, then ₱2.00/min. Charged for the real wait."

**What stays the same:** a ride that is already booked keeps the fare it was booked with (decision #5). Only the waiting fee uses the real waiting minutes at the end.
