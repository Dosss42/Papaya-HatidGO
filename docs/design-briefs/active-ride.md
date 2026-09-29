# Design Brief — Passenger Active Ride Screen

> **Status:** ✅ Confirmed (2026-09-29)
> **Produced by:** `/impeccable shape` (planning only, no code)
> **Route:** `/passenger/ride/:id`, from right after **Mag-book** until the ride is completed or cancelled
> **Built in:** Phase 10 (with the booking flow); live driver marker and route line in Phase 12
> **Mode:** Operate. The passenger is *monitoring* a task under mild stress ("is someone coming? which tricycle is mine?").
> **Platform:** Android, Material 3. System Back always works.
> **Visual world:** Not chosen yet (Phase 5). This brief fixes **structure, content, and behavior only**.
> **Copy:** Everyday Taglish, following the glossary in [passenger-booking.md § 8](passenger-booking.md#8-copy-deck-clarified).
> **Related:** [passenger-booking.md](passenger-booking.md) (the flow before this) · phase-0-analysis.md § E (ride lifecycle)

---

## 1. Job and audience

**Who:** the same passenger who just tapped Mag-book. Usually standing at the pickup point, glancing at the phone between looking up the road. On a Balikan ride, they're later at the destination (school, clinic, palengke) and may not look at the phone for 30–60 minutes.

**Job:** "Tell me, at a glance: **is someone coming, who, which tricycle, and what do I do now?**"

**Success:**
- The passenger always knows the **current status** within one glance (about 1 second, the status line alone).
- They can **identify the right tricycle** on a busy road (body number and plate, shown large).
- They're never unsure what to do next: wait, go outside, pay, rate, or re-book.

---

## 2. Selected structure

**One screen whose content changes with the ride status.** It's not a separate page per status.

```text
┌───────────────────────────────┐
│            MAP                │  pickup / destination markers
│   (driver marker from P12)    │  (live driver position + route line: Phase 12)
├───────────────────────────────┤
│  STATUS LINE  (largest text)  │  ← answers "what's happening" in one glance
│  stage track: ●──●──○──○      │  ← where we are in the whole ride
├───────────────────────────────┤
│  DRIVER CARD                  │  name · body no. · plate · color · [📞]
│  (from accepted onward)       │
├───────────────────────────────┤
│  context block (per status)   │  e.g. pickup landmark / waiting timer / fare
│  [ PRIMARY ACTION if any ]    │  only when the passenger has something to do
│  secondary: Kanselahin        │  only while cancelling is allowed
└───────────────────────────────┘
```

### Why one morphing screen, not a page per status

1. **The status changes on its own, not from the passenger's taps.** A new page per status would mean pages switching under the passenger's thumb. One screen that updates in place feels calm and predictable.
2. **The same questions matter in every status:** where, who, which tricycle, how much. Keeping them in fixed positions means the eye learns where to look once.
3. **Correct Back behavior.** There's nothing "behind" an active ride to go back to (the booking is done). Back leaves the screen normally, and the Book tab returns here while the ride is active.
4. **Resilient to polling.** Every 3–5 seconds the screen re-reads `GET /rides/{id}` and redraws whatever changed. There are no page transitions to break mid-update.

### Why the status line is the largest element

The passenger glances at the phone while watching the road. The status line ("Papunta na si Mang Juan", Mang Juan is on his way) must be readable in **about 1 second in bright sun**. Everything else is secondary to it.

### Why body number and plate are large

On a street with several tricycles, the passenger identifies theirs by the **body number** painted on the side, and the plate. This is the passenger's most important safety check, so it gets the second-largest text on the screen, not a small grey line.

---

## 3. Status-by-status content

The stage track shows **4 stages for One-way** (Hinahanap → Papunta sa'yo → Nandito na → Biyahe) and **6 for Balikan** (… → Papunta → Naghihintay → Pabalik). "Biyahe" means the trip; "Hinahanap" means looking for a driver.

| Status (server) | Status line | Context block | Primary action | Cancel allowed? |
|---|---|---|---|---|
| `requested` (searching) | **Naghahanap ng driver…** | Booking summary: pickup → destination, ride type, tantya ₱85 | — | ✅ |
| `accepted` / `driver_arriving` | **Papunta na si {driver}** | Distance: "{1.2 km} ang layo" · your pickup landmark (so you can check it's right) | 📞 call is in the driver card | ✅ |
| `arrived` | **Nandito na si {driver}** | "Dumating {2 min} na ang nakaraan", plus body no. and plate repeated large | — | ✅ |
| `in_progress` (One-way) | **Papunta ka na sa destinasyon** | Destination + landmark · tantya ₱85 | — | ❌ |
| `in_progress` + outbound (Balikan) | **Papunta ka na sa destinasyon** | Leg: "Papunta (1 of 2)" · destination | — | ❌ |
| `in_progress` + waiting (Balikan) | **Naghihintay si {driver}** | "Sinabi mo: {30 min} · {12 min} na" (a timer that counts up) | **Pabalik na ako** | ❌ |
| `in_progress` + return (Balikan) | **Pabalik ka na sa pickup** | Leg: "Pabalik (2 of 2)" · pickup + landmark | — | ❌ |
| `completed` | **Nandito ka na!** | **Bayaran si {driver} ng ₱85 (cash)** · Tantya vs final if different · rating (below) | **Isumite ang rating** | — |
| `cancelled` by driver | **Kinansela ng driver ang biyahe.** | Reason if given · "Hindi ka sisingilin." (you won't be charged) | **Mag-book ulit** (same details) | — |
| `cancelled` by system (no driver) | **Walang available na driver ngayon.** | "Naka-save ang booking mo." | **Subukan ulit** · secondary: Baguhin ang booking | — |
| `cancelled` by passenger | **Kinansela mo ang biyahe.** | — | **Mag-book ulit** | — |

**Why there's no ETA in minutes:** the MVP computes straight-line distance (Haversine) and has no road routing or traffic data. A minutes estimate would often be wrong, and a wrong ETA does more harm than none. Showing the **distance** is honest. An ETA can come with road routing later (phase-0 § I).

---

## 4. The driver card

| Element | Detail | Why |
|---|---|---|
| Initials avatar + name | e.g. "JD · Juan Dela Cruz". No photo in the MVP (the ERD has no public profile photo; verification documents stay private). | Recognizable without exposing private documents |
| **Body no. + plate** (large) | "Body no. **127** · **ABC 1234**" | The identification check on the street |
| Tricycle color | "Pula na tricycle" (red tricycle), from `vehicles.color` | A quick first filter before reading numbers |
| Rating | "★ 4.8" (hidden when the driver has fewer than 5 ratings) | Some trust signal, without showing unreliable averages from tiny samples |
| 📞 **Call button** | Opens the phone's dialer (`tel:`). Accessible name: "Tawagan si {driver}". The number itself is not printed. | Tricycle pickups often need a quick call. Showing the button but not the number keeps the privacy rule (contact only during an active ride) simple. |

The card appears from `accepted` onward and **disappears (with the call button) once the ride is completed or cancelled**, matching the rule "phone numbers visible only between the matched pair during an active ride".

---

## 5. Actions

### Cancel (until `arrived`)
- A secondary text button, **"Kanselahin"**, **never** styled like the primary action, and away from the call button.
- Tapping it opens a **modal bottom sheet** (the one interruption in this flow, because cancelling can't be undone):
  - Title: **Kanselahin ang biyahe?**
  - Optional reason chips: *Matagal ang driver · Nagbago ang plano · Mali ang pickup · Iba pa*
  - Buttons: **[Kanselahin ang biyahe]** (destructive) · **[Huwag na]** (dismiss)
- There's no required reason. Chips are one tap, and the admin still gets data when people give one.
- After `in_progress`, the Kanselahin button is **not shown at all** (per the lifecycle rules). Hiding it is clearer than a disabled button that begs the question "why not?".

### Pabalik na ako (Balikan, waiting leg only)
- The primary button while the driver waits.
- It sends the driver a notification. It **doesn't change the ride status**: only the driver starts the return leg, so the state machine stays as designed.
- After tapping: the button becomes a confirmation, **"Nasabihan na si {driver}"** (the driver has been told), disabled for 5 minutes so it can't be spammed.
- **Backend consequence:** a new endpoint and notification event (see § 8).

### Rating (after `completed`)
- **1–5 stars** (a large touch target per star) + an optional comment, "Mensahe tungkol sa biyahe (opsyonal)" (a note about the ride, optional).
- **Isumite ang rating** (submit), or **Mamaya na** (later). Rating can also be done from Rides › ride details, so skipping loses nothing.
- If the passenger is offline, the rating is queued in SQLite `pending_sync` (it's safe to retry, phase-0 § H).

### Payment instruction (after `completed`)
- **"Bayaran si {driver} ng ₱85 (cash)"** (pay {driver} ₱85 in cash) is the most prominent line on the completed state. The passenger's next real-world action is handing over cash, so the screen states it directly.
- If the final fare differs from the estimate (e.g. a waiting fee later): "Tantya: ₱85 → **Final: ₱95**", with the breakdown one tap away.

---

## 6. States and resilience

| Condition | Behavior |
|---|---|
| Polling | `GET /rides/{id}` every 3–5 s while the screen is visible; paused in the background, with an immediate refresh when the app resumes |
| Weak or no connection | A slim banner, **"Mahina ang koneksyon. Huling update: {1 min} na."** (weak connection, last update 1 min ago). The last known status stays visible and nothing blanks out. |
| App was closed mid-ride | On launch, `GET /rides/active` → opens this screen (the resume rule from phase-0 § B) |
| Status jumps (e.g. `accepted` → `arrived` between polls) | Just show the newest status. The stage track fills the skipped stages. |
| Driver location unknown (before Phase 12, or no GPS fix) | Hide the distance line rather than showing "0 km" |
| Status change while the app is in the background | Before Phase 13: seen on return (resume refresh). From Phase 13: a push notification for accepted / arrived / started / completed / cancelled (phase-0 § J). |
| Status change while looking at the screen | The status line cross-fades (~200 ms). On **arrived**, add a short vibration: the one moment the passenger must look up. It respects the system setting to remove animations. |
| Long names | Driver names wrap to 2 lines; body no. and plate never truncate |

---

## 7. Interaction and layout intent

- **Hierarchy:** status line (1st) → body no. + plate (2nd) → the one primary action (3rd) → everything else.
- **Map share:** about 45% during searching / arriving (where the driver is matters), shrinking during the trip, where the status matters more than the map.
- **One primary action at most** per status. Many statuses have none, and that's intentional: during `driver_arriving`, the passenger's job is to wait, not to tap.
- **Touch targets** ≥ 48 × 48 dp, including the stars and the call button. **Call and Kanselahin are never adjacent.**
- **Type** uses Material roles and scales with the system font size (tested at 1.3×). **Dark theme** is designed. The status line and numbers must stay readable in direct sun.
- **Tab bar stays visible.** The passenger can check Account, and the Book tab leads back to this screen while a ride is active.

---

## 8. Constraints, consequences, and open decisions

**Consequences for the system design** (update phase-0 once this brief is confirmed):

| Area | Change |
|---|---|
| API | New `POST /rides/{id}/passenger-returning`: passenger only, ride in `in_progress` + `waiting`, rate-limited to one call per 5 min. It sends a notification and **changes no status**. |
| Notifications (§ J) | New event: **"Pabalik na ang pasahero"** (the passenger is on the way back) → driver, push |
| `GET /rides/{id}` response | Must include: driver name, vehicle body no. / plate / color, driver rating (with count), and for the matched passenger only, the driver phone number for the `tel:` link |
| Ratings | Show the average only when count ≥ 5 |

**Constraints:**
- Status transitions come only from the server. The screen never advances a status by itself.
- Everything goes through `RideService` (polling, cancel, passenger-returning, rating). The page stays thin.
- Driver phone: only in the response to the **matched passenger**, only while the ride is active (the security rule in phase-0 § K).

**Open decisions (don't invent these while building):**

| # | Decision | Default until decided |
|---|---|---|
| 1 | Can the driver cancel after `arrived` for a no-show, and after how long? | Proposed in phase-0 E.3; the passenger sees the driver-cancel state either way |
| 2 | What counts as "long waiting" on Balikan (beyond the chosen time) | No alert in the MVP; the timer just keeps counting |
| 3 | Share trip / SOS | Later phase. The layout reserves a spot in the context block during `in_progress`. |
| 4 | Driver profile photo | None in the MVP (initials avatar) |

**Anti-goals, which would make this feel wrong even if polished:**
- An ETA in minutes that the system can't actually compute.
- A cancel button that looks like, or sits next to, the call button.
- A screen that blanks or shows a spinner when the connection drops mid-ride.
- Hiding the body number or plate in small grey text.
- Asking for a rating *before* telling the passenger how much cash to hand over.

---

## 9. Copy deck

Glossary and voice: [passenger-booking.md § 8](passenger-booking.md#8-copy-deck-clarified). `{driver}` is the driver's first name, with "Mang" (a respectful title for an older man) optional, following local usage. Write each message as one string with placeholders.

| Place | Copy |
|---|---|
| Searching | Naghahanap ng driver… |
| Arriving | Papunta na si {driver} · {distance} ang layo |
| Arrived | Nandito na si {driver} · Dumating {minutes} min na ang nakaraan |
| Trip (One-way / outbound) | Papunta ka na sa destinasyon |
| Waiting (Balikan) | Naghihintay si {driver} · Sinabi mo: {chosen} · {elapsed} na |
| Return (Balikan) | Pabalik ka na sa pickup |
| Returning button → after | Pabalik na ako → Nasabihan na si {driver} |
| Completed | Nandito ka na! · Bayaran si {driver} ng {fare} (cash) |
| Rating | Kumusta ang biyahe? · Isumite ang rating · Mamaya na |
| Cancel sheet | Kanselahin ang biyahe? · [Kanselahin ang biyahe] · [Huwag na] |
| Cancel reasons | Matagal ang driver · Nagbago ang plano · Mali ang pickup · Iba pa |
| Driver cancelled | Kinansela ng driver ang biyahe. Hindi ka sisingilin. · [Mag-book ulit] |
| No driver | Walang available na driver ngayon. Naka-save ang booking mo. · [Subukan ulit] · Baguhin ang booking |
| Passenger cancelled | Kinansela mo ang biyahe. · [Mag-book ulit] |
| Weak connection | Mahina ang koneksyon. Huling update: {time} na. |
| Call button (accessible name) | Tawagan si {driver} |

"Hindi ka sisingilin" (you won't be charged) is true in the MVP because payment is cash, and no fee exists for a ride that never happened. If cancellation fees are ever introduced, this line must change.
