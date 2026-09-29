# Design Brief — Passenger Booking Flow

> **Status:** ✅ Confirmed (2026-09-29)
> **Produced by:** `/impeccable shape` (planning only, no code)
> **Route:** `/passenger/book` (Book tab), from opening the tab to tapping **Mag-book**
> **Built in:** Phase 10 (passenger ride screens)
> **Mode:** Operate. The passenger is completing a task. Clarity and speed beat expression.
> **Platform:** Android. Material 3 structure (navigation bar, bottom sheet, filled button, chips, snackbar); system Back always works.
> **Visual world:** Not chosen yet. It's decided in Phase 5, when the first real screens are built (see IMPECCABLE-GUIDE.md). This brief fixes **structure, content, and behavior only**.

---

## 1. Job and audience

**Who:** a passenger in Papaya. Often standing outdoors (roadside, school gate, palengke), phone in one hand, sometimes holding bags or a child. Mid- or low-range Android phone, bright sun, patchy data. Varied tech experience. Thinks in **landmarks** ("sa tapat ng simbahan"), not street addresses.

**Job:** "Get a tricycle to pick me up **here** and take me **there**. Maybe bring me back. Know roughly what I'll pay before I commit."

**Success:** a ride is requested in **three steps or fewer, under about 30 seconds** for a typical trip, with the passenger sure about three things: *where the driver will find me*, *one-way or balikan*, and *about how much, in cash*.

---

## 2. Outcome and product truth

The flow must make these rules visible without explaining them at length:

| Rule (from PRODUCT.md) | How the flow shows it |
|---|---|
| An active subscription is required to book | Checked **before** step 1. A blocked state with a direct path to renew, never a failure at the last tap. |
| The fare is an **estimate**, computed by the server, paid in **cash** | "Tinatayang pamasahe" (estimated fare) + "Cash sa driver" beside the total. The number always comes from `/fare/estimate`, never computed on the phone. |
| One-way and two-way (balikan) | Both options shown **side by side with their totals**, so the choice is informed |
| Two-way includes a waiting leg | A wait-time choice appears **only** when Balikan is selected |
| One active ride per passenger | If a ride is already active, the Book tab goes straight to the active ride screen |
| Service area limited to Papaya | A pin outside the area gets an inline error, before a fare is ever requested |

---

## 3. Selected structure

**One map-backed screen with a bottom sheet that advances through three steps.** Each step is its own child route, so the Android Back button steps backward naturally.

```text
/passenger/book              ── shell: map (top ~55%) + bottom sheet (router outlet)
   ├── /pickup      Step 1  "Saan ka susunduin?"      (Where will we pick you up?)
   ├── /destination Step 2  "Saan ka pupunta?"        (Where are you going?)
   └── /ride        Step 3  "Pumili ng biyahe"         (Choose your ride) → [ Mag-book · ₱85 ]
```

### Why one screen with a sheet, not separate full pages

1. **The map is the shared context.** The pin you set in step 1 stays visible in steps 2 and 3, and the route line appears once both points exist. Separate pages would hide the map between steps, so the passenger loses sight of *where* they are booking.
2. **Fewer full-page transitions on low-end phones.** Only the sheet's content changes, and the map stays mounted. That's faster, and saves data because tiles aren't reloaded.
3. **Thumb reach.** Every decision and the primary button live in the bottom half of the screen, reachable one-handed.
4. **It's the Material 3 pattern** for "a map plus a task" (a standard bottom sheet), so it's familiar to Android users.
5. **Child routes give correct Back behavior for free.** Back from step 3 → step 2 → step 1 → leave the tab. The system Back is never hijacked.

### Why three steps, not four (a deliberate change from the original brief)

The original brief put **"Select ride type" first**. This flow moves it to **step 3 and merges it with the fare review**:

- The one-way vs balikan choice is **a price decision**, and it can only be informed once pickup and destination exist, because only then do both totals exist ("One-way ₱45 · Balikan ₱85").
- Merging type + review + book into one step removes a whole screen. The passenger sees the options, the price, and the button together, and one tap confirms.
- Choosing the type first would force a guess ("two-way… how much will that be?") and a back-track when the price surprises.

---

## 4. The three steps in detail

### Step 1: Pickup, "Saan ka susunduin?"

| Element | Behavior | Why |
|---|---|---|
| Map centered on GPS position, fixed center pin | The passenger **moves the map** under the pin to adjust | GPS is often 10–50 m off. A fixed-center pin is easier to place precisely with one thumb than dragging a small marker. |
| "Gamitin ang lokasyon ko" (use my location) button | Re-centers on GPS | One tap to recover after panning away |
| Landmark note field (optional, ≤ 120 chars) | Placeholder: *"Hal. asul na gate, tabi ng sari-sari store"* (e.g. blue gate beside the sari-sari store) | Tricycle drivers find people by landmarks. This note is what the driver reads. |
| Primary button **"Dito ako susunduin"** (pick me up here) | Advances to step 2 | Commits the pickup explicitly |

### Step 2: Destination, "Saan ka pupunta?"

| Element | Behavior | Why |
|---|---|---|
| Pickup summary row (compact, tappable) | Tap = back to step 1 to edit | The passenger can always see and fix the pickup without losing progress |
| Map with a fixed center pin for the destination | The pickup marker stays on the map as a second marker | Both points visible, with the spatial relationship obvious |
| Landmark note (optional) | *"Hal. harap ng munisipyo"* (e.g. in front of the town hall) | Same reason as pickup |
| Primary button **"Dito ako pupunta"** (I'm going here) | Requests the fare estimate for **both** ride types, then advances | Both estimates are fetched once, so step 3 opens with real numbers |

### Step 3: Choose ride and book, "Pumili ng biyahe"

| Element | Behavior | Why |
|---|---|---|
| Route summary: pickup → destination (compact) | Tap either one to edit that step | Last chance to catch a wrong pin, without navigating away |
| **Two selectable option cards** (radio behavior) | **One-way** · ₱45 · "Hanggang destinasyon" (up to the destination) <br> **Balikan (two-way)** · ₱85 · "Hihintayin ka at ibabalik" (the driver waits and brings you back) | The price comparison *is* the decision. Cards (not a toggle) give room for the total and a one-line meaning. |
| Wait-time chips, **only when Balikan is selected** | "Gaano katagal ka doon?" (How long will you be there?) · 15 min · 30 min · 1 hr · "Hindi sigurado" (not sure) | The driver knows whether to wait. Chips are one tap, with no typing. A waiting fee can be added later without a new screen. |
| Fare breakdown, collapsed by default | Expand: base fare, distance × rate, return fare, waiting fee (₱0 until decided), service fee | Transparency for anyone who wants it, without cluttering the default view |
| Estimate notice | "Tinatayang pamasahe · Cash sa driver" (estimated fare · cash to the driver) | Sets the expectation that the final amount may differ slightly, and that no online payment happens |
| Optional note to driver | "Mensahe sa driver" (message to the driver), collapsed field | Maps to `ride_requests.passenger_note` |
| **Primary button: "Mag-book · ₱85"** | Shows the selected option's total. Disabled until a type (and a wait time, for balikan) is chosen. | Putting the price in the button means the passenger confirms *that amount*, never a surprise |

**After Mag-book:** go to `/passenger/ride/:id` (the searching state of the active ride screen, a separate brief). `replaceUrl`, so Back doesn't return to a finished booking form.

---

## 5. States and ranges

### Gates, checked when the Book tab opens (in this order)

| Condition | What the passenger sees |
|---|---|
| Already has an active ride | Redirect to the active ride screen, with no booking form |
| Subscription inactive or expired | The sheet shows a **blocked card** in place of step 1: "Kailangan ng aktibong subscription para mag-book." (An active subscription is needed to book.) + **[I-renew / Mag-subscribe]** (renew / subscribe) → Account › Subscription. The map stays visible but inactive. |
| Location permission not granted yet | Short reason first: "Para mahanap ka ng driver, kailangan ang lokasyon mo." (So a driver can find you, we need your location.) → system permission prompt |
| Permission denied | Continue **without GPS**: the map opens on the town center with the pin movable by hand, plus a small banner, "Naka-off ang location. Ilipat ang mapa sa pickup mo." (Location is off. Move the map to your pickup.), and a link to Settings |
| GPS off / timeout | Same as denied, plus a retry |

### In-flow states

| State | Behavior |
|---|---|
| Pin outside the service area | Inline message on the sheet: "Wala pa kami sa lugar na ito." (We don't serve this area yet.) Primary button disabled. |
| Pickup and destination too close (< ~100 m) | Inline: "Masyadong malapit ang destinasyon." (The destination is too close.) |
| Fare estimate loading | Skeleton option cards (never a spinner over the whole screen) |
| Fare estimate failed | Inline error + **[Subukan ulit]** (try again). The pins are kept. |
| Offline | Top banner "Walang internet" (no internet). Booking disabled. Pins and notes kept. |
| Ride type disabled by admin (e.g. balikan off) | That card is not shown at all; one-way only |
| Mag-book tapped | Button → loading state; double-tap prevented |
| Server rejects: subscription expired mid-flow | Blocked card (as above); pins kept for after renewal |
| Server rejects: fare changed since the estimate | The sheet updates to the new total with a notice, "Nagbago ang pamasahe" (the fare changed); the passenger must tap Mag-book again |
| Server rejects: passenger already has an active ride | Go to the active ride screen |

### Realistic content ranges (for layout)

| Content | Range |
|---|---|
| Trip distance in town | ~0.3 – 10 km |
| Fare total | ~₱30 – ₱250 (sample values until the admin sets real rates) |
| Landmark note | 0 – 120 characters (wrap to 2 lines max in summaries, then truncate) |
| Taglish labels | Up to ~1.5× longer than English equivalents; no fixed-width buttons |

---

## 6. Interaction and layout intent

- **Hierarchy per step:** question (title) → the one thing to set → the primary button. One primary action per step, **full width, at the bottom of the sheet**.
- **The sheet** has a peek height that always shows the step's title and primary button. It expands for the fare breakdown and notes. The map keeps at least ~40% of the screen.
- **The step position** is shown subtly (e.g. 1 / 3), for orientation, not as a stepper UI that competes with the task.
- **Feedback:** snackbars for transient issues (estimate retry succeeded); inline messages for anything that blocks the primary action; a dialog **only** to confirm abandoning a half-filled booking, if needed at all.
- **Motion:** the sheet content cross-fades between steps (~200 ms); the map pans smoothly to each point. Follows the system "Remove animations" setting.
- **Touch targets:** ≥ 48 × 48 dp, ≥ 8 dp apart, including the chips and option cards.
- **Text** uses the Material type roles and scales with the system font size (test at 1.3×). Nothing clips.
- **Dark theme** is designed, not inverted (your Redmi runs dark mode).
- **Outdoor legibility:** the price and primary button must stay readable in direct sun, so they need strong contrast in both themes.

---

## 7. Constraints and open decisions

**Constraints:**
- The map sits behind `MapService` (Leaflet + OpenStreetMap), and GPS behind `LocationService`. Pages never touch the plugins directly.
- The fare comes only from `POST /fare/estimate`, called once for both ride types. `POST /rides` recomputes it on the server.
- **Phase dependency to fix:** this flow **needs a basic map in Phase 10**, but Maps is scheduled for Phase 12. Recommendation: Phase 10 builds a *basic* `MapService` (tiles + center pin + two markers), and Phase 12 adds the live driver marker and route line.
- `pickup_address` / `destination_address` (ERD) store the landmark note. There's no geocoding service in the MVP.
- Copy here is **draft Taglish**. It's finalized with `/impeccable clarify` after the screens exist.

**Open decisions (don't invent these while building):**

| # | Decision | Default until decided |
|---|---|---|
| 1 | Wait-time choices for balikan | 15 min / 30 min / 1 hr / Hindi sigurado |
| 2 | Waiting fee rule | ₱0, shown as "₱0 (libre ang paghihintay)" (waiting is free) only in the breakdown |
| 3 | Return fare multiplier | 1.0 (same rate as outbound) |
| 4 | Minimum trip distance | ~100 m |
| 5 | Saved places (Home, School…) | Out of scope for the MVP; the structure leaves room for a shortcut row in step 2 later |

**Anti-goals, which would make this feel wrong even if polished:**
- A search-box-first screen copied from big-city ride-hailing apps. In Papaya, landmarks beat addresses.
- A price that only appears after tapping Mag-book.
- Choosing one-way or balikan before any price is visible.
- Blocking the passenger at the final tap for a subscription problem that was knowable at the start.
- A full-screen spinner while waiting for the estimate.
