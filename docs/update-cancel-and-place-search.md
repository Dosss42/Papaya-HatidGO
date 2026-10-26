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

**For the student:** in MapTiler's dashboard, restrict the key to your app and admin site before release (it's visible inside the APK, like any map key).
