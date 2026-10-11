# Phase 9 — Ride state machine + matching (backend)

**Goal:**
- A passenger books a one-way or Balikan ride with a server-computed fare.
- The nearest eligible drivers receive it, and the first to accept wins.
- The ride moves through its stages only in the allowed order.
- Everything is proven by tests before any ride screen depends on it (Phases 10–11).

**Done when (phase-0 § M):** the RIDE / MATCH tests pass in PHPUnit (and the Postman collection plays a full ride).

**Rules come from:**
- [phase-0-analysis.md § E](phase-0-analysis.md#e-ride-types-and-the-ride-lifecycle): types, fares, statuses, transitions, matching.
- § G: the API.
- § I: location cadence.
- § K: security.
- § L: RIDE / MATCH test cases.
- The confirmed briefs [passenger-booking](design-briefs/passenger-booking.md), [active-ride](design-briefs/active-ride.md) and [driver-home](design-briefs/driver-home.md), for the API details their screens need.

**Backend only.** No screens in this phase. Ride screens are Phase 10 (passenger) and 11 (driver).

## 1. What already exists (Phase 4 / 7 / 8)

| Piece | Notes |
|---|---|
| `ride_requests` | 7 statuses + `current_leg` · fare breakdown columns · **`final_total` is computed by MySQL** (N15) · **one active ride per passenger and per driver enforced by UNIQUE generated keys** (N16) · 7 CHECKs keep status consistent (N17) · `reference_no` (HG-000123) and `waiting_minutes` are derived, not stored (N13, N14) |
| `ride_offers` | offered / declined / expired / closed. No "accepted": the winner is `ride_requests.driver_id` (N12) |
| `ride_locations`, `ratings` | Route trail · one rating per ride (UNIQUE) |
| `fare_settings` | Insert-only versions; current = newest in effect. Seed: base ₱30, ₱10/km, minimum ₱30, return × 1.0, waiting ₱0 |
| `system_settings` | Ride types on/off · `matching.radius_km` 3 · `matching.max_offers` 5 · `matching.request_timeout_seconds` 120 · `matching.stale_online_minutes` 3 · `ride.min_distance_m` 100 · service-area circle (placeholder) |
| `drivers` | `is_online`, `current_lat/lng`, `location_updated_at` |
| Phase 7–8 | `DriverComplianceService::eligibility()` (go-online checklist) · `subscribed` middleware · `PATCH /drivers/me/availability` |

## 2. How it works

```text
PASSENGER                     LARAVEL                                         DRIVERS (nearest, eligible)
POST /fare/estimate ───────►  FareService: Haversine km → both ride types
◄──── one-way ₱62 · balikan ₱94
POST /rides {…, expected_total} ─► gates: account · subscription · no active ride · type enabled
                              · inside service area · not too close · fare unchanged
                              → ride "requested", expires in 120 s
                              → DriverMatchingService: up to 5 nearest eligible ──► ride_offers
GET /rides/{id} (poll 3–5 s) ─► expired? → cancelled (no driver) · top up offers   GET /drivers/me/offers (poll 5 s)
                                                                                    POST /rides/{id}/accept
                              UPDATE … SET status='accepted' WHERE status='requested'  ◄── first one wins
                              (0 rows → 409 for the second driver) · other offers closed
                              depart → arrive → start → (Balikan: reach-destination → start-return) → complete
POST /rides/{id}/rating
```

## 3. Implementation steps

| Step | Task |
|---|---|
| 9.1 | `GeoService` (Haversine, service area) · `FareService` (estimate + final fare, using the ride's own fare version) · `GET /ride-types` · `POST /fare/estimate` · unit tests for every fare rule |
| 9.2 | `RideService::create` (`POST /rides`): every booking gate + fare recomputed + `FARE_CHANGED` · `DriverMatchingService` (nearest eligible, offers, top-up) · `POST /drivers/me/location` |
| 9.3 | Driver side: `GET /drivers/me/offers` · **race-safe accept** · decline · the transitions (depart, arrive, start, reach-destination, start-return, complete, end-at-destination) · `409` for every other combination |
| 9.4 | Cancel (passenger / driver / admin) · expiry (on every read + `rides:expire` every minute) · stale drivers offline (`drivers:offline-stale`) · ride trail · rating · passenger-returning · `GET /rides`, `/rides/active`, `/rides/{id}` with the privacy rules · admin ride list + cancel |
| 9.5 | Postman (a full ride, played as passenger + driver) · live test against the dev server, including **two real simultaneous accepts** · report · commit |

## 4. Decisions

The student asked for the phase straight through, so these are recommendations taken as decided. **The open decisions of phase-0 § N keep their documented defaults; none is decided here.**

| # | Decision | Why |
|---|---|---|
| 1 | **Matching runs inside the requests**: at booking, after a decline, and on each passenger poll of a requested ride, it "tops up" to 5 open offers | No queue worker to run on WAMP. A driver who comes online during the 2 minutes still receives the request at the next passenger poll (3–5 s) |
| 2 | **Expiry is checked on every read** (passenger poll, driver offers) **and** by `rides:expire` every minute; stale drivers go offline with `drivers:offline-stale` | E.5 #7. The flow is correct even when the scheduler isn't running on a dev PC |
| 3 | Cancel: the passenger can cancel before the trip starts, **reason optional** (the brief's chips). The driver can cancel an accepted ride before the start, **reason required**. **No "N minutes after arrival" rule yet** | Open decision #11 keeps its proposal status. Phase 0 E.3 + active-ride brief |
| 4 | `end-at-destination` (Balikan passenger doesn't come back) is built as proposed in E.3: driver only, waiting leg, reason required, fare = outbound + waiting fee | Without it a driver could be stuck in the waiting leg forever. Marked "proposed" in the report |
| 5 | Final fare = the estimate's parts, priced with **the ride's own fare version**, except the waiting fee, which uses the real waiting minutes (₱0 under the current rule). `return_km = outbound_km` (v1) | E.1. A fare change by the admin never alters a ride already booked |
| 6 | `POST /rides` takes the `expected_total` the passenger saw. If the server's total differs → `409 FARE_CHANGED` with the new estimate | The booking brief's E5 state: the passenger confirms the amount, never a surprise |
| 7 | Phone numbers: the matched passenger sees the driver's, and the driver sees the passenger's, **only from accepted until the ride ends**. Before accepting, the driver sees no name or phone | phase-0 § K privacy, driver-home brief |
| 8 | "Pabalik na ako" stores `passenger_returning_at` (new column), so the driver's poll shows it; once per 5 minutes | "The ride flow never depends on push" (§ J). The push itself comes in Phase 13 |
| 9 | Accept re-checks the driver **at that moment**: online, located in the last 3 minutes, verified, tricycle verified, subscribed, not on another ride | § K "eligibility checked at the moment of the action" |

## 5. Test plan (summary)

| # | Test | Expected |
|---|---|---|
| RIDE-01 | One-way happy path, then rating | requested → accepted → driver_arriving → arrived → in_progress → completed; final = estimate; rating saved once |
| RIDE-02 | Book without a subscription | 403 `SUBSCRIPTION_INACTIVE` |
| RIDE-03 | Book twice | 409 `ACTIVE_RIDE_EXISTS` |
| RIDE-04 | Pickup outside the service area / too close / type disabled | 422 with the reason |
| RIDE-05 | Driver calls `complete` while `arrived` (and every other wrong order) | 409 `INVALID_TRANSITION`, status unchanged |
| RIDE-06 | Passenger cancels at each allowed stage; not after the start | Cancelled with `cancelled_by = passenger`; 409 once `in_progress` |
| RIDE-07 | No driver accepts within 120 s | Cancelled by the system, reason `no_driver`; offers expired |
| RIDE-08 | Balikan legs | outbound → waiting → return → completed; waiting minutes derived; total = outbound + return + waiting fee |
| RIDE-09 | Fare changed between estimate and booking | 409 `FARE_CHANGED` with the new total |
| RIDE-10 | IDOR: another passenger / an unrelated driver opens the ride | 404 |
| MATCH-01 | Only eligible drivers receive the offer | Offline, stale, unverified, unsubscribed, busy or too far → no offer; nearest first, max 5 |
| MATCH-02 | Two drivers accept the same ride | Exactly one wins; the other gets 409 `RIDE_TAKEN` |
| MATCH-03 | A decline | Offer `declined`; the next nearest driver is offered |

---

## 6. Implementation log (becomes the report in 9.5)

| Step | Result |
|---|---|
| 9.1 | ✅ `GeoService` (Haversine, service-area circle) · `FareService` + `FareQuote` (centavos, the ride's own fare version, final fare) · `GET /ride-types` · `POST /fare/estimate` (both enabled types at once) · trip validation shared with booking (errors on the wrong pin) · **7 fare tests** |
| 9.2 | ✅ `RideService::create` (account, type enabled, one active ride, fare recomputed, `FARE_CHANGED`) under the Phase 8 `subscribed` gate · `DriverMatchingService` (eligible drivers nearest first, offers, top-up) · `POST /drivers/me/location` · going online can carry the position · **12 booking tests** |
| 9.3 | ✅ `GET /drivers/me/offers` (no passenger name or phone) · **race-safe accept** (one conditional UPDATE) · decline + next driver · depart / arrive / start / reach-destination / start-return / complete / end-at-destination · `409 INVALID_TRANSITION` naming the current stage · **16 tests** (matching 9, flow 7) |
| 9.4 | ✅ Cancel (passenger / driver / admin) · expiry on every read + `rides:expire` · `drivers:offline-stale` · route trail · rating · "Pabalik na ako" (`passenger_returning_at`, migration `2026_10_11_100000`) · `GET /rides`, `/rides/active`, `/rides/{id}` with the privacy rules · admin rides + cancel · **10 tests** |
| 9.5 | ✅ Postman (passenger + driver folders) · **live test on the dev server: two drivers accepted at the same instant → 200 + 409** · full ride + rating · report · **API 194 / 194 tests, 1,007 assertions** (45 new) |

### Problems found

| # | Problem | Cause | Fix |
|---|---|---|---|
| 1 | **A driver who pressed "Laktawan" could still accept the ride afterwards** (found by MATCH-03) | `accept()` checked that an offer row existed, not that it was still open | Accept now requires the offer to be `offered`; a declined one → `409 OFFER_GONE` |
| 2 | The migration and tests couldn't reach MySQL | WAMP wasn't running | Started WAMP (`wampmanager.exe`). If tests ever hang or say "connection refused", check the WAMP tray icon is green |
| 3 | The dev server started from a PowerShell call stopped when the call ended | The process belonged to that call | Run `php artisan serve` in its own terminal (as usual), or as a background task |
| 4 | Two test-setup mistakes: duplicate random body numbers (UNIQUE in the database), and a 6th equally-near driver sometimes not among the 5 offered | Test helpers, not the app | `fake()->unique()`; more offers in the cancel/privacy tests |
| 5 | The live script printed "complete: arrived" for a refused step | The refusal carries the current status in `data`; the printout showed that instead of the error code | The printout shows the code first: `INVALID_TRANSITION (… at the pickup.)` |

---

## 7. Step notes (explained)

### 9.1 Distance and fares

**`GeoService`**
- `distanceKm()`: the **Haversine** formula, the straight-line distance over the Earth's surface (radius 6,371 km). There's no road routing in the MVP (phase-0 § I), so a trip's fare uses straight-line km. The active-ride screen shows a distance, never an ETA in minutes (decision 19).
- `insideServiceArea()`: within `service_area.radius_km` of `service_area.center` (system settings). The circle is a **placeholder** until the town boundary is confirmed (open decision #15).

**`FareService`: the only place a fare is computed**

| Rule (phase-0 § E.1) | Code |
|---|---|
| One-way: `max(minimum, base + km × rate)` + service fee | `quote()` → `outbound` |
| Balikan: + return `km × rate × multiplier` (no second base fare) + waiting fee | `return`, `waitingFee()` |
| Waiting fee `max(0, minutes − free) × per minute` | ₱0 under the seeded rule (open decision) |
| `return_km = outbound_km` in v1 | `returnDistanceKm` |
| Final fare at completion | `finalize()`: **the ride's own fare version** (`fare_setting_id`), so an admin's price change never alters a booked ride; only the waiting fee uses the real waiting minutes |

**Why centavos?** `0.1 + 0.2` in floating point is `0.30000000000000004`. Every amount is computed in whole centavos (₱52.20 → `5220`), rounded once, and turned back into `"52.20"` only for the database and the API.

**Endpoints**
- `GET /ride-types` says which types are on. A disabled card isn't shown at all (booking brief).
- `POST /fare/estimate` prices every enabled type in **one call**, so the sheet shows "One-way ₱52 · Balikan ₱74" together.
- The trip rules (`ValidatesTrip`) are shared with booking: coordinates in range, both pins in the service area, at least 100 m apart. An error is attached to **the pin that's wrong**, so the app can mark that pin.

### 9.2 Booking and matching

**`POST /rides`: the gates, in order (§ E.5 step 1)**

1. **Subscription**: the Phase 8 `subscribed` middleware → 403 `SUBSCRIPTION_INACTIVE`.
2. **Account active**: suspension lives on the user (Phase 7) → 403 `ACCOUNT_SUSPENDED`.
3. **Ride type switched on** → 422 `RIDE_TYPE_DISABLED`.
4. **No other active ride**: a request that ran out a second ago is expired first, so it doesn't block. → 409 `ACTIVE_RIDE_EXISTS` with `data.ride_id`, so the app can open that ride.
5. **Fare recomputed on the server.** If the app sent the `expected_total` it showed and the server's differs → 409 `FARE_CHANGED` with the new estimate (booking brief E5). Any fare fields the app sends are simply ignored (tested).
6. Save as `requested`, expiring in 120 s. **MySQL itself** refuses a second active ride for the same passenger (the `active_passenger_key` UNIQUE column, N16), so even a double tap that slips past step 4 ends with one ride.
7. **Matching**: offers to the nearest eligible drivers.

**`DriverMatchingService`: who gets the offer (MATCH-01).** All of these must hold:
- online;
- **located in the last 3 minutes** (the stale-online rule);
- verified papers and a verified tricycle;
- an active subscription;
- account active;
- not on another ride;
- within 3 km of the pickup.

The database narrows the list with the cheap conditions. Distance and subscription are then checked in PHP: a small town has tens of drivers, not thousands. The nearest 5 receive a `ride_offers` row.

**"Top-up" (decision #1).** Matching runs again after a decline and on every passenger poll, until 5 offers are open. A driver who comes online during the 2 minutes still gets the request within seconds, with no queue worker needed on WAMP.

**Locations**
- `POST /drivers/me/location` is the idle ping (every 60 s).
- `PATCH /drivers/me/availability` can now carry `lat`/`lng`, so a driver going online is matchable at once.

### 9.3 Accept, decline, and the state machine

**Race-safe accept (MATCH-02, § K threat #2).** The winner is decided by **one** SQL statement:

```sql
UPDATE ride_requests SET status='accepted', driver_id=?, vehicle_id=?, accepted_at=NOW()
WHERE id=? AND status='requested' AND expires_at > NOW()
```

MySQL runs one UPDATE on a row at a time. The first changes 1 row. The second finds `status = 'accepted'`, changes **0 rows**, and that driver gets `409 RIDE_TAKEN`. There's no window where both can win, and the live test proved it with two requests fired at the same instant (§ 9.5).

Before the UPDATE, the driver is **re-checked at that moment** (decision #9): still online, located recently, eligible. A driver whose phone died after the offer → `403 CANNOT_ACCEPT`. The `active_driver_key` UNIQUE column also stops one driver from holding two active rides.

**Decline** ("Laktawan") marks the offer `declined`, then the next nearest driver is offered (MATCH-03). A declined driver can't accept later (problem 1).

**The transitions (`RideService`).** Each one locks the ride row, checks it's **this driver's** ride (404 otherwise), checks the current stage (409 otherwise), then saves:

| Action | From | To |
|---|---|---|
| depart | accepted | driver_arriving |
| arrive | driver_arriving | arrived |
| start | arrived | in_progress (Balikan: leg `outbound`) |
| reach-destination | Balikan, `outbound` | leg `waiting` |
| start-return | Balikan, `waiting` | leg `return` |
| complete | one-way in progress, or Balikan on `return` | completed + final fare |
| end-at-destination (proposed) | Balikan, `waiting` | completed, no return fare, reason → audit log |

Every other combination → `409 INVALID_TRANSITION`, with a message naming where the ride is ("This can't be done while the ride is at the pickup."). The machine-readable status is in `data`. The 7 CHECK constraints from Phase 4 (N17) are the last guard: even a coding mistake couldn't save, say, a completed ride without `completed_at`.

### 9.4 Cancel, expiry, privacy, trail, rating

**Cancel (decision #3)**

| Who | When | Reason |
|---|---|---|
| Passenger | requested → arrived (before the trip starts) | optional (the brief's chips) |
| Assigned driver | accepted → arrived | required |
| Admin | any active stage | required, audit-logged |

Cancelling closes the open offers. Once the trip has started, the passenger and driver can't cancel (the proposed rule; open decision #11).

**Expiry (RIDE-07).** No accept within 120 s → cancelled with `cancelled_by = system`, `cancel_reason = no_driver`, and the offers are marked `expired`. It's checked on the **passenger's poll** and the **driver's offer list**, and every minute by `rides:expire`. The update is conditional (`WHERE status='requested'`), so it can never cancel a ride a driver accepted a millisecond earlier.

**Stale drivers.** `drivers:offline-stale` (every minute) sets offline any driver whose last location is older than 3 minutes, so the stored state never pretends they're online (driver-home brief).

**Privacy (decision #7, § K)**
- Phone numbers appear **only between the matched pair, from accepted until the ride ends**. Afterwards they're `null` (tested both ways).
- An offer shows no passenger name or phone.
- Anyone else's ride → **404** (not 403, so ride ids can't be probed).

**Trail.** `POST /rides/{id}/locations` takes batches of up to 50 points. The newest point becomes the driver's current position, which the passenger sees as "0.33 km ang layo" (hidden when unknown, never "0 km").

**Rating.** Passenger only, once, after completion (the UNIQUE `ride_request_id` blocks a second rating). The driver's average and count show on the ride.

**"Pabalik na ako".** Only while the driver waits (Balikan `waiting` leg), at most once per 5 minutes (429). It stores `passenger_returning_at` and **changes no status**. The driver's poll shows it; Phase 13 adds the push.

**Reading rides**
- `GET /rides/{id}` is the poll target.
- `GET /rides/active` is for resuming when the app opens.
- `GET /rides` is the history, 20 per page.
- Admin: `GET /admin/rides?status=&type=`.

### 9.5 Postman, live test, report

**Live test against the dev server** (WAMP + `php artisan serve`, the dev seed; script in the session scratchpad):

```text
estimate: one_way 52.20 | two_way 74.40
booked: HG-000002 requested
offers seen: 2      (Juan)
offers seen: 2      (Pedro)
--- both accept at the same instant (two background requests)
juan  HTTP 200
pedro HTTP 409
  won, driver Juan
  RIDE_TAKEN: Another driver took this ride.
depart: driver_arriving
arrive: arrived
complete: INVALID_TRANSITION (This can't be done while the ride is at the pickup.)
start: in_progress
complete: completed
passenger sees: completed, total ₱52.20, driver phone shown: false
rating: {"score":5,"comment":"Salamat po!"}
```

**Postman.** Two new folders, **Rides › Passenger (Maria)** and **Rides › Driver (Juan)**, play the same ride by hand. The collection description gives the order. Admin gained "Rides" and "Cancel a stuck ride".

---

## 8. Phase 9 report (summary)

**Result:** ✅ The **done when** condition (phase-0 § M) is met: the RIDE / MATCH tests pass in PHPUnit, and a full ride was played live against the dev server.

| Test case | Where |
|---|---|
| RIDE-01 one-way happy path + rating | `RideFlowTest`, live run |
| RIDE-02 booking without a subscription | `BookingTest` |
| RIDE-03 one active ride | `BookingTest` |
| RIDE-04 outside area / too close / type disabled / suspended | `BookingTest` |
| RIDE-05 every wrong order → 409 | `RideFlowTest`, live run |
| RIDE-06 cancel at each stage | `CancelExpiryPrivacyTest` |
| RIDE-07 no driver → system cancel | `CancelExpiryPrivacyTest` |
| RIDE-08 Balikan legs + waiting fee | `RideFlowTest` |
| RIDE-09 fare changed | `BookingTest` |
| RIDE-10 IDOR | `CancelExpiryPrivacyTest` |
| MATCH-01 eligibility (9 ineligible cases) | `MatchingTest` |
| MATCH-02 double accept | `MatchingTest` + **live, truly simultaneous** |
| MATCH-03 decline → next driver | `MatchingTest` |

| | Phase 9 added | Totals now |
|---|---|---|
| API (`papaya-hatidgo-api`) | Geo + fare services, matching, the ride state machine, 23 ride endpoints, 2 scheduled commands, 1 migration, Postman folders | **194 tests, 1,007 assertions** (45 new) |
| Mobile | — (backend phase) | unchanged, 65 tests |

**Deviations / notes:**
- `reference_no` and `waiting_minutes` are derived, not stored (Phase 4, N13 / N14), and appear in every ride response.
- `end-at-destination` and the cancellation limits are built as **proposed** in phase-0 E.3. The panel's decision (#11) may change them.
- Notifications (new offer, accepted, arrived, cancelled, no driver, passenger returning) are marked in the code for **Phase 13**. Until then, the screens learn everything by polling, as designed.

**For the student, before Phase 10–11:**
- Keep WAMP running and `php artisan serve` open.
- For the scheduled jobs (`rides:expire`, `drivers:offline-stale`, `documents:expire`), run `php artisan schedule:work` in another terminal. Without it the flow still works (expiry also happens on every poll), but stale drivers stay "online" in the database.

**Next:** Phase 10, the passenger ride screens. Booking with a basic map, the active ride screen and rating are built on these endpoints, with `MapService` (Leaflet) as the booking brief recommends.
