# Phase 12 — Maps: route line and live driver marker

**Goal:**
- Both people see **where the ride goes** and **where the driver is**, live, on the same map.
- The booking map draws the route as soon as both pins exist.
- The driver's marker glides to each new position instead of jumping.
- A position that has gone old is shown as old, never as live.
- A finished ride shows the path that was actually driven.

**Done when (phase-0 § M):** pins, route, and driver position visible.

**Rules come from:**
- [phase-0 § I](phase-0-analysis.md#i-gps-and-location): `MapService` owns pins, the driver marker and the route line. The server computes distances (Haversine).
- [passenger-booking.md § 2](design-briefs/passenger-booking.md): "the route line appears once both points exist".
- [active-ride.md](design-briefs/active-ride.md): "live driver position + route line: Phase 12"; "hide the distance line rather than showing 0 km".
- [DESIGN.md](../DESIGN.md): Always White, mark + word, green only for success, honour reduced motion.

## 1. What already exists

| Piece | From |
|---|---|
| `MapService` (Leaflet + OSM): markers, fit, `rideMapInset` | Phases 10, 11 |
| The driver's trail every 10 s → `ride_locations` + `drivers.current_lat/lng` | Phases 9, 11 |
| The passenger's ride resource: `driver.location {lat, lng, updated_at, distance_to_pickup_km}` while matched | Phase 9 |
| Passenger polls the ride every 4 s; the driver's screen likewise | Phases 10, 11 |

## 2. Implementation steps

| Step | Task |
|---|---|
| 12.1 | API: `GET /rides/{id}/trail`, the driven path (the ride's passenger or driver only, thinned to ≤ 300 points) · tests |
| 12.2 | `MapService`: lines (`route`, `approach`, `trail`), a **gliding** driver marker (reduced motion = jump), a **stale** marker look · pure helpers in `map-geometry.ts` (interpolation, staleness, "x min ago") · unit tests |
| 12.3 | Passenger: the route line on Book steps 2–3; on the ride screen the route, the driver's approach line, the gliding marker, "Last location: 2 min ago" when stale; the driven path on a finished ride |
| 12.4 | Driver: the same lines on `/driver/ride/:id` (own position = the last position sent); the driven path when finished |
| 12.5 | Emulator: the driver moves (geo fixes / trail points) while the other side watches · finish review · report · commit |

## 3. Decisions

The student asked for the phase straight through; these were taken without asking.

| # | Decision | Why |
|---|---|---|
| 1 | The planned route is a **straight dashed line** from pickup to destination, not a road route | The fare is computed on the straight-line (Haversine) distance (phase-0 § I). A road route from a free public router would show a different distance from the one charged, and would add an outside service with rate limits. A dashed line reads as "direction", not "the road to take" |
| 2 | Three line styles: **route** = Ink, dashed, 3px · **approach** (driver → pickup, before the trip) = Deep Papaya, dotted, 3px · **driven path** (finished ride) = Deep Papaya, solid, 4px | Distinguishable by pattern, not just color (mark + word rule) |
| 3 | The marker **glides** for ~1 s to each new position; with "Remove animations" on, it jumps | Positions arrive every 4–10 s; a jump looks like teleporting. Reduced motion is a DESIGN.md rule |
| 4 | A driver position older than **45 s** is **stale**: the marker turns grey-ringed and the screen says "Last location: 2 min ago" instead of the distance | The driver sends every 10 s during a ride; 45 s = several missed sends. Never show an old position as live (active-ride brief) |
| 5 | The driven path is shown only on a **finished** ride's details, to its passenger and driver, and it covers **the trip only** (from "Simulan ang biyahe" on) | While the ride is active, the live marker is the information; afterwards the path is the record (useful in a complaint). Nobody else can read it, and the driver's whereabouts before the pickup aren't part of the passenger's record (added during the live check, problem 4) |
| 6 | The path is **thinned on the server** to ≤ 600 points (300 at first) | A long ride stays small for a phone on mobile data, yet keeps its turns |
| 7 | **The student chose MapTiler "Streets"** (asked during the phase) over Google Maps and plain OpenStreetMap. The key lives in `src/environments/map-key.ts`, which is **git-ignored**; without a key the app falls back to OpenStreetMap | The OSM tiles have no high-resolution version, so street names were small and soft on dense phone screens ("not clear"). MapTiler is sharp (@2x), Google-like, and free (no credit card); Google Maps needs a billing account and a rewrite of `MapService`. CARTO now requires a key too (tried, refused). Keys are never committed (the student's rule) |

## 4. Test plan (summary)

| # | Test | Expected |
|---|---|---|
| M1 | Book: pickup set, then destination | The dashed route line appears between the pins (steps 2–3) |
| M2 | Ride accepted, driver moving | The marker glides along; the dotted approach line follows it to the pickup |
| M3 | Trip started | The approach line goes; the route line stays; the marker keeps moving |
| M4 | Driver stops sending (> 45 s) | The marker turns stale; "Last location: 1 min ago"; the distance line hides |
| M5 | Ride finished, open details (both roles) | The solid driven path from pickup to destination |
| M6 | Someone else asks for the trail | 403 / 404 |
| M7 | "Remove animations" on | The marker jumps, no glide |

---

## 5. Implementation log

| Step | Result |
|---|---|
| 12.1 | API `GET /rides/{id}/trail`: the trip's path (from `started_at`), oldest first, thinned to ≤ 600 points, 404 for anyone else's ride. `TrailTest` (5 tests). API **205 tests** ✅ |
| 12.2 | `MapService`: `setLine` (route / approach / trail), `setMarker(…, { glide })`, `setMarkerStale`, and `rideMapInset` rewritten. `map-geometry.ts` holds the pure helpers + `rideLines()`; line and stale styles are in `world.scss`. 7 new unit tests ✅ |
| 12.3 | Passenger: the route on Book steps 2–3; on the ride screen the route, approach, gliding marker, "Last location: … ago", and the driven path; a finished ride's map back at full height ✅ |
| 12.4 | Driver: the same lines from the last position sent; the own marker goes stale when the GPS is lost; the driven path when finished ✅ |
| 12.5 | M1–M7 on the emulator, both roles (the other side through the API) ✅ · finish review (below) |

### Problems found

| # | Problem | Cause | Fix |
|---|---|---|---|
| 1 | Some code lost its text while I edited it with a shell script (an empty `className:`) | Backticks inside a bash double-quoted script ran as commands | Re-typed the four places by hand; the build caught nothing left |
| 2 | A finished ride's driven path was zoomed out to the whole province | `rideMapInset` reserved the back button's full height across the map. On a ~240 px map, that left ~100 px for the ride | Reserve the status bar (measured) + 36 px only; the back button covers a corner. DevTools on the WebView confirmed the sizes |
| 3 | The pickup sat half under the status bar on the driver's map | The old fallback margin (60 px) was smaller than the status bar + a pin | Same fix as 2 |
| 4 | The passenger's "driven path" began where the driver was before the pickup | The trail endpoint returned every point of the ride, including the approach | Only points from `started_at` (the trip). It's also more private: the driver's earlier whereabouts aren't in the passenger's record. New test |
| 5 | The finished passenger map was too small to read | It kept the small trip-time size | Small only during `in_progress`; a finished ride's map is its record |
| 6 | Juan's and Maria's dev subscriptions had ended (it's 11 days later) | Dev data from Phase 8 | Extended in the dev database for testing (no code change) |
| 7 | WAMP didn't start from the script (UAC prompt cancelled) | Windows asks before WAMP starts | MySQL was up shortly after; tests ran normally |
| 8 | On MapTiler, a finished ride showed **no line at all** | Two fits ran close together (the route, then the driven path that arrived right after). **Leaflet ignores a new view while a zoom animation is running**, so the second fit was dropped and the new line stayed drawn for the old zoom (DevTools showed it collapsed to one point off-screen) | Fits now snap (`animate: false`, after `map.stop()`). Only the marker glide and "Nasaan ako?" animate |
| 10 | (The student, after the report) **"Straight lines between points are not enough: show the way he went"** | A point every 10 s joins far-apart spots with straight jumps that cut corners; a failed upload kept only the newest 5 points, so a signal gap became one long jump | During a ride the phone **records a point about every 3 s** (uploads still every 10 s, in batches), skips standing still (< 5 m) and vague fixes (> ±50 m), and **keeps every unsent point** through a gap (up to ~30 min), sent oldest first. Waiting online keeps the GPS at 10 s (battery). The server keeps up to 600 points. An L-shaped drive on the emulator now shows both corners (`p12-27`) |
| 9 | "Last location: 2 min ago" looked too old during the check | It wasn't: more time had passed than I estimated. The API gave the right age (0 → 21 s over 20 s), and the emulator's and the PC's clocks matched | No change; the hidden announcement correctly kept the age at the moment it went stale (48 s) |

---

## 6. Step notes (explained)

### 6.1 Why the route is a straight dashed line
The app has no road-routing service, and it doesn't need one yet. The **fare is computed on the straight-line (Haversine) distance** (phase-0 § I). A road route drawn by a free public router would show a different, usually longer, distance than the one the passenger is charged, and the passenger would rightly ask why. A free router is also an outside service with rate limits that could fail in a demo. So the line is straight, like the distance behind the price, and **dashed**, so it reads as "this direction" and not "drive this road". If road routing comes later, it fits behind `MapService` and `FareService` without touching the pages.

### 6.2 How the marker glides
Positions arrive every 4–10 s. Setting the marker to each new one makes the tricycle "teleport". `MapService` instead moves it over 1 s with `requestAnimationFrame`:
- On every frame (about 60 times a second), it computes a point between the old and the new position (`lerpPoint`), pushed along by an **ease-out** curve (`easeOut`): fast at first, gentle at the end, so it *arrives* rather than stopping dead.
- A new position that arrives mid-glide starts from wherever the marker is at that moment, so it never jumps back.
- Under "Remove animations" (`prefers-reduced-motion`), and for movements under ~1 m, it simply jumps.
- Running frames are cancelled when the marker is removed or the map is destroyed, so nothing keeps drawing on a screen that's gone.

On the emulator, sampling the marker's position every 30 ms during one send showed **19 small steps over ~0.85 s**, large first and small last, the ease-out working as designed.

### 6.3 Stale means "don't trust it"
The driver sends a position every 10 s during a ride. If the last one is **older than 45 s** (several missed sends: no signal, GPS lost, phone asleep), showing it as live would lie. So, on the passenger's screen:
- the tricycle and its ring turn Soft Ink and fade (a mark, not just a color change);
- the dotted approach line disappears (it would point from the wrong place);
- "0.46 km away" becomes "Last location: 1 min ago".

As soon as a fresh position arrives, all three return. On the driver's own screen, "stale" means the GPS is lost (the Phase 11 signal), since the driver's map shows the position that was last *sent*.

### 6.4 One rule for both screens: `rideLines()`
Which lines show is decided in one pure function used by both ride screens: the ride's status, the pins, the driver's position and whether it's stale, and the driven path. Before the trip it returns the route plus (if live) the approach; during the trip the route; when finished the driven path, or the route if there isn't one. Being a plain function, its rules are unit-tested without a map.

### 6.5 The driven path, and why only the trip
`GET /rides/{id}/trail` reads `ride_locations`, the points the driver's phone sent every 10 s. It returns:
- only the points recorded **from "Simulan ang biyahe" on**: the trip the passenger paid for, not where the driver was before;
- **oldest first**, for the ride's own passenger and driver (anyone else gets 404, so ride ids can't be probed);
- at most **600 points**: a long ride is thinned evenly, always keeping the first and the last point, so the line still starts and ends where the trip did.

The app asks for it once, when a ride is finished, and draws it solid in Deep Papaya; the map frames the pins and the whole path. It's useful when a passenger and a driver disagree about a ride, or for the admin later (Phase 14).

### 6.6 Fitting pins under what floats over the map
A ride map runs edge to edge, under the status bar's white strip and, at the bottom, under the sheet's rounded top. `rideMapInset()` measures the status bar on the page itself (every phone differs) and adds room for a pin, plus 36 px at the bottom. Phase 11 also reserved the floating back button's full height. On a 240 px map that ate half the height and zoomed a 1 km ride out to the whole province (problem 2). The back button only covers the top-left corner, where a route rarely is.

### 6.7 MapTiler, and keeping its key out of git
`environments/map-tiles.ts` decides the tiles. With a key in `map-key.ts`, it uses MapTiler "Streets": 512 px tiles drawn one zoom level lower (`tileSize: 512, zoomOffset: -1`), so streets keep their usual size. `{r}` asks for the `@2x` version on dense screens, which is what makes the names sharp. Without a key it uses OpenStreetMap, as before. The credit for both is shown on the map, as their terms require.

The key is a local secret:
- `src/environments/map-key.ts` is in `.gitignore`.
- `map-key.example.ts` (committed) shows the shape with an empty key.
- `scripts/ensure-map-key.js` creates `map-key.ts` from the example before `npm start` / `build` / `test` / `android:dev`, so a fresh clone still builds (with OpenStreetMap).

**Before release:** in the MapTiler account, restrict the key to the app (allowed origins). The key is inside the APK, so anyone could read it there.

### 6.8 Finish review (12.5)
The `impeccable-finish-reviewer` returned **8 material fixes**, all applied and rechecked:

| # | Finding | Fix |
|---|---|---|
| 1 | The stale look only updated on a successful poll: with the passenger's own connection down, the text said "stale" while the marker and the approach line still looked live | Both screens redraw the map when a poll fails too |
| 2 | The driver's "stale" was only "GPS lost": failed sends left a live-looking marker while the passenger saw a stale one | `sentAt` on the location service; stale = GPS lost **or** last send > 45 s |
| 3 | The driver's screen greyed the marker with no word | A `role="status"` notice: "GPS lost…" or "Your location hasn't been sent for {time}…" |
| 4 | A finished passenger map could keep its small size (no re-measure) | The box size is part of the framing key, so Leaflet measures again |
| 5 | Staleness compared the server's time with the phone's clock | The API sends `age_seconds`; the app adds the time since the answer arrived (one clock) |
| 6 | Screen readers never heard that the position went stale, and some statuses had no word for it | A hidden live region announces it once (age frozen at that moment); the "Last location" line shows in every active status where the marker is stale |
| 7 | The driver's finished map still used the small size class | Same rule as the passenger's (small only during the trip) |
| 8 | The driver page's effect redrew the map twice per poll | `drawMap` runs `untracked` inside the effect |

---

## 7. Tests

**Unit (mobile 109, 8 new):** `map-geometry.spec` (glide interpolation and easing, age on one clock, stale, "x ago", `rideLines` for every status, same-point) and the updated shift spec.

**API (206, 6 new):** `TrailTest` (both roles, oldest first, thinning keeps the ends, nobody else, empty path, **the way to the pickup isn't in the trip**) and `LocationAgeTest` (`age_seconds` on the server's clock).

**Live (emulator; the other side through the API):**

| # | Test | Result |
|---|---|---|
| M1 | Book steps 2–3 | The dashed line follows the center pin in step 2 and joins the two pins in step 3 ✅ (`p12-06/07`, `p12-21`) |
| M2 | Accepted, the driver moving | The dotted approach line from the tricycle to the pickup, on both screens. One send = **19 animation steps over ~0.85 s** (ease-out), sampled in DevTools ✅ (`p12-01/02`, `p12-08`, `p12-22`) |
| M3 | Trip started | The approach line goes, the dashed route stays ✅ (`p12-03`) |
| M4 | No sends > 45 s | Grey tricycle, no approach line, "Last location: 1 min ago"; a new send makes it live again ✅ (`p12-09`, `p12-23`). Driver with GPS off: "GPS lost. Passengers can't find you." + grey marker ✅ (`p12-26`) |
| M5 | Finished ride, both roles | The solid driven path of the trip, framed with the pins ✅ (`p12-12`, `p12-25`) |
| M6 | Someone else's trail | 404 (API test) ✅ |
| M7 | "Remove animations" on | The WebView reports `prefers-reduced-motion: reduce` after a restart; `MapService` then jumps instead of gliding ✅ |
| — | MapTiler | Sharp tiles with readable place names ("General Tinio", "Tik Tock Diner"); the credit "© MapTiler © OpenStreetMap contributors" is shown ✅ (`p12-20…26`) |

---

## 8. Phase 12 report (summary)

**Result:** ✅ The **done when** condition is met: **pins, route, and driver position visible**, on both people's screens, live, with old positions shown as old and the trip's path kept as a record.

| | Phase 12 added | Totals now |
|---|---|---|
| API (`papaya-hatidgo-api`) | `GET /rides/{id}/trail` (the trip, thinned) · `driver.location.age_seconds` | **206 tests** (6 new) |
| Mobile (`papaya-hatid-go`) | Lines, glide and stale in `MapService`; `map-geometry.ts`; the route on Book; the live map on both ride screens; MapTiler with a local key; snapping fits | **109 unit tests** (8 new) |

**Deviations (recorded):** the route is straight, not by road (decision 1); MapTiler instead of plain OpenStreetMap (decision 7, the student's choice).

**For the student:**
- **Your MapTiler key** is only on this PC (`src/environments/map-key.ts`, not committed). On another PC, create that file from `map-key.example.ts` and paste the key again. **Before release**, restrict the key in your MapTiler account (allowed origins).
- **Dev data:** Juan's and Maria's subscriptions were extended to Nov 24 in the dev database for testing.
- The one ESLint error (`register.page.ts:54`) is still the older one, left as is.

**After the report (problem 10):** the driven path now follows the roads taken: a point every ~3 s during a ride, nothing dropped in a signal gap. Unit tests 112 (3 new); the corner test is `p12-27`.

**Next:** Phase 13, notifications: in-app and push (FCM) for "a driver accepted", "your driver is here", "the ride was cancelled", subscription reminders. **It needs your Firebase project** (`google-services.json`), which only you can create.
