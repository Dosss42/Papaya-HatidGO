# Design Brief — Driver Home (Online, Offline, Incoming Request)

> **Status:** ✅ Confirmed (2026-09-29), with the student's change: a compact map on the online Home (§ 2)
> **Produced by:** `/impeccable shape` (planning only, no code)
> **Route:** `/driver/home`, for a **verified, eligible** driver. (Unverified or ineligible drivers see the checklist from [driver-requirements.md](driver-requirements.md).)
> **Built in:** Phase 11 (driver ride screens + earnings)
> **Mode:** Operate. The driver is at work: waiting, then deciding fast.
> **Platform:** Android, Material 3. System Back always works.
> **Visual world:** Not chosen yet (Phase 5). Structure, content, and behavior only.
> **Copy:** Everyday Taglish; glossary in [passenger-booking.md § 8](passenger-booking.md#8-copy-deck-clarified).
> **Related:** phase-0-analysis.md § E.5 (matching), § I (location cadence) · driver active ride screen (brief still to be written)

---

## 1. Job and audience

**Who:** a verified tricycle driver during a working day. Parked at the terminal (paradahan), at a corner, or cruising. The phone is mounted on the handlebar, in a shirt pocket, or on the seat. Outdoors, in bright sun, with road noise. Their income depends on **not missing requests** and **not taking bad ones**.

**Job:** "Let me go online, wait without babysitting the phone, **notice every request instantly**, and decide in a few seconds whether to take it."

**Success:**
- Going online or offline is **one tap**, and the current state is obvious from across the tricycle seat.
- An incoming request **cannot be missed** while online, even with the phone in a pocket.
- A decision takes **under 5 seconds**, because everything needed to decide is on one screen.
- The driver knows how the day is going ("₱540 · 9 biyahe") without opening another tab.

---

## 2. Selected structure

**Three states on one route, plus a full-screen takeover for requests:**

```text
OFFLINE                         ONLINE (waiting)                  INCOMING REQUEST (full screen)
┌──────────────────────┐        ┌──────────────────────┐          ┌──────────────────────┐
│ Offline ka.          │        │  small map · ● you   │          │ May pasahero!   1:24 │
│                      │        │ ● Online ka          │          │ BALIKAN · 30 min     │
│ Ngayong araw         │        │ Naghihintay ng        │          │                      │
│ ₱540 · 9 biyahe      │        │ pasahero…             │          │ ₱85  (cash)          │
│                      │        │ Ngayong araw          │          │                      │
│                      │        │ ₱540 · 9 biyahe       │          │ Sundo: 0.8 km        │
│ [   MAG-ONLINE   ]   │        │                      │          │  "asul na gate…"     │
│                      │        │ 🔋 Naka-on ang screen │          │ Hatid: Munisipyo     │
│                      │        │ [ Mag-offline ]      │          │  "harap ng munisipyo"│
└──────────────────────┘        └──────────────────────┘          │ [Laktawan][TANGGAPIN]│
                                                                   └──────────────────────┘
```

### A compact map on the online Home (student's decision), built to be cheap

The online Home shows a **small map** (about the top third of the screen) with the driver's own position. It confirms at a glance that GPS is working and shows where they are in town, which reassures the driver that the system can see them.

The screen stays on for hours while online, so the map is deliberately **low-cost**:

| Rule | Why |
|---|---|
| The marker moves **only when a location update is sent** (every 60 s or 100 m, the same cadence as phase-0 § I), never continuously | No constant redraws; the map uses the same data the server receives |
| **No auto-follow or auto-pan.** The map re-centers only when the marker leaves the visible area, or when the driver taps "Nasaan ako?" (where am I?) | Tile downloads happen only when truly needed |
| **Zoom fixed to the town** (the service area), with pinch-zoom allowed | Keeps tile loading to one small, repeatedly cached area |
| **Tiles cached** by the WebView after first load | The same streets aren't downloaded every day |
| **Dark map style in dark theme** | Less battery on OLED screens that stay lit |
| **No map while offline** | Offline Home stays text-only; the map starts with Mag-online and stops with Mag-offline |
| If location is unavailable | The map hides and the "Nawala ang GPS" banner takes its place, never a map with a stale marker |

**Not on this map:** other drivers, passenger demand, or heatmaps. These are out of scope (not in the MVP), and showing other drivers' positions would expose their location.

### Why a large button, not a switch

A Material switch is a small target, and going online is **the** action of this screen. When **Offline**, "Mag-online" is a large filled button. When **Online**, the state itself becomes the headline ("● Online ka"), and **Mag-offline** is a smaller outlined button. Going offline is less frequent, and an accidental tap costs the driver requests. No confirmation dialog either way: both actions are instantly reversible.

### Why a full-screen takeover for requests

The driver is looking at the road, not the phone. A request must **interrupt**: full screen, a loud tone, and vibration, so it's noticed from a pocket or a handlebar mount. It's also the one screen where a fast, confident decision matters most, so it gets the whole display and nothing else competes with it.

---

## 3. The three states

### 3.1 Offline
| Element | Content |
|---|---|
| Headline | **Offline ka.** |
| Today summary | **Ngayong araw: ₱540 · 9 biyahe** (cash from completed rides; tap → Earnings tab) |
| Banners (only when relevant) | Document expiring in ≤ 30 days (from the requirements brief) · subscription ending in ≤ 3 days → **[I-renew]** |
| Primary | **[Mag-online]** (large) |

### 3.2 Going online (a few seconds)
In order, with the button showing **"Nag-o-online…"**:
1. **Location permission.** If it's missing: "Para makatanggap ng pasahero malapit sa'yo, kailangan ang lokasyon mo." (To receive passengers near you, we need your location.) → system prompt.
2. **A GPS fix.** If there's none after ~10 s: **"Hindi makuha ang lokasyon mo. Siguraduhing naka-on ang GPS."** + [Subukan ulit]. The driver stays offline, because matching needs a real position.
3. **Server eligibility check** (`PATCH /drivers/me/availability`). If it's refused, show the server's checklist reason, e.g. "Expired na ang subscription mo." + [I-renew]. It never fails silently.
4. On success: **keep-awake on**, location updates start (every 60 s or 100 m, phase-0 § I), and offer polling starts (every 5 s).

### 3.3 Online, waiting
| Element | Content |
|---|---|
| Compact map (top ~⅓) | The driver's own position; marker updates only with each location send; "Nasaan ako?" re-center button (see § 2 rules) |
| Headline | **● Online ka** · Naghihintay ng pasahero… (waiting for passengers) |
| Today summary | Same as offline |
| Screen-on notice | 🔋 **Naka-on ang screen habang online.** I-charge ang phone kung kaya. (The screen stays on while online. Charge the phone if you can.) |
| Secondary | **[Mag-offline]** (outlined) |

---

## 4. Incoming request (full-screen takeover)

Shown as a full-screen modal over Home, with a loud tone + vibration pattern (repeating every ~5 s until acted on, or until the request ends).

| Order | Element | Content | Why |
|---|---|---|---|
| 1 | Header + time left | **May pasahero!** · **1:24** (counts down to the request's `expires_at`) | Urgency, stated honestly: this is the real time before the request expires, not an artificial countdown |
| 2 | Ride type badge | **One-way**, or **Balikan · maghihintay nang {30 min}** (will wait {30 min}) | Balikan commits the driver to waiting, so it's a key reason to accept or skip |
| 3 | Fare | **₱85** (cash) · "tantya" | The largest number: the driver's main decision input |
| 4 | Pickup | **Sundo: {0.8 km} mula sa'yo** (pickup: 0.8 km from you) · landmark note | How far to go with no fare yet |
| 5 | Destination | **Hatid: {area}** · landmark note | Where the paid trip goes (confirmed: shown before accepting) |
| 6 | Passenger note | If any: "May dala akong malaking bag" | Can change the decision (space, luggage) |
| 7 | Actions | **[Laktawan]** (outlined, left) · **[TANGGAPIN]** (filled, right, larger) | Accept sits where the right thumb rests. Skip is available but visually secondary. They're far apart to prevent mis-taps. |

**What the passenger's name is not shown:** it's not needed to decide, and it's revealed after accepting in the active ride screen, keeping personal data to the matched pair (phase-0 § K).

### Outcomes

| Event | What the driver sees |
|---|---|
| Tap **Tanggapin** | Button → "Tinatanggap…" → success → the **driver active ride** screen (navigate to pickup) |
| Another driver accepted first (server `409`) | **"Nakuha na ng ibang driver."** (another driver took it) Auto-closes after 3 s → back to Online, waiting. No blame, no dialog. |
| Tap **Laktawan** | Closes immediately → Online, waiting. Recorded as `declined` in `ride_offers`. |
| Passenger cancelled / request expired while showing | **"Wala na ang request na ito."** (this request is no longer available) Auto-closes after 3 s. |
| Two requests at once | Show **one at a time**, nearest pickup first, with "+1 pang request" (one more request) in the header. After a decision, the next one appears if it's still open. |

---

## 5. Resilience

| Condition | Behavior |
|---|---|
| Internet lost while online | Banner: **"Walang internet. Hindi ka makakatanggap ng pasahero hanggang bumalik ang koneksyon."** (No internet. You won't receive passengers until the connection returns.) The online state is kept locally; the server stops matching this driver (see § 7, stale-online rule). |
| GPS lost while online | Banner: **"Nawala ang GPS. Hindi ka makikita ng mga pasahero."** (GPS lost. Passengers can't find you.) + [Subukan ulit] |
| Became ineligible while online (document or subscription expired, via the scheduler) | Forced offline. Headline: **"Na-offline ka: {reason}."** (You were taken offline: {reason}.) + a next-step button (upload / renew) |
| Driver has an active ride | Home redirects to the driver active ride screen (like the passenger resume rule) |
| App closed while online | On reopen: Offline (the server's stale-online rule has already stopped matching). The driver taps Mag-online again. This is honest rather than pretending to be online. |
| Silent / vibrate mode | The in-app tone plays at **media volume**. The Home shows the tip "Lakasan ang volume para marinig ang request." (turn up the volume to hear requests) if the volume is at 0 while online. |

---

## 6. Interaction and layout intent

- **The state is readable from ~1 m away:** "Online ka" / "Offline ka" is the largest text on Home, with a colored status dot plus the word (never color alone).
- **Touch targets:** Mag-online and Tanggapin are **extra-large** (≥ 64 dp tall); everything else ≥ 48 dp. Laktawan and Tanggapin are separated.
- **Sound and vibration** only for incoming requests, the one event that must interrupt. No other sounds in the app.
- **Motion:** the request slides up over Home (~250 ms); state changes cross-fade. Honors the system setting to remove animations.
- **Type** uses Material roles, scaled with system font size (1.3× tested). **Dark theme** is designed, which also helps battery on OLED screens while the screen stays on.

---

## 7. Consequences for the system design

(Update phase-0 once this brief is confirmed.)

| Area | Change | Why |
|---|---|---|
| **Plugin (§ G)** | Add `@capacitor-community/keep-awake`, active only while online | Keeps the screen on so polling continues |
| **Matching rule (§ E.5)** | A driver counts as online only if `location_updated_at` is within the last **3 minutes**. The scheduler sets stale drivers offline. | A driver whose phone died or lost signal must not receive, and then silently miss, requests |
| **`GET /drivers/me/offers` response** | Include: `expires_at`, ride type + wait minutes, estimated fare, pickup distance from the driver + landmark, destination area + landmark, passenger note. **No passenger name or phone.** | Everything needed to decide, nothing personal |
| **Earnings summary** | `GET /drivers/me/earnings?period=day` is used on Home | Already in the API; confirms it's needed in Phase 11 |
| **Audio asset** | A short, distinct request tone (royalty-free) bundled with the app | The alert must work without network |

---

## 8. Copy deck

| Place | Copy |
|---|---|
| Offline headline | Offline ka. |
| Online headline | ● Online ka · Naghihintay ng pasahero… |
| Map re-center button | Nasaan ako? |
| Buttons | Mag-online → Nag-o-online… · Mag-offline |
| Today | Ngayong araw: {amount} · {n} biyahe |
| Screen-on tip | Naka-on ang screen habang online. I-charge ang phone kung kaya. |
| Volume tip | Lakasan ang volume para marinig ang request. |
| Request header | May pasahero! · {mm:ss} |
| Ride type | One-way · Balikan · maghihintay nang {wait} |
| Pickup / destination labels | Sundo: {distance} mula sa'yo · Hatid: {area} |
| Request actions | Laktawan · Tanggapin → Tinatanggap… |
| Taken | Nakuha na ng ibang driver. |
| Gone | Wala na ang request na ito. |
| Queue | +{n} pang request |
| No internet | Walang internet. Hindi ka makakatanggap ng pasahero hanggang bumalik ang koneksyon. |
| GPS lost | Nawala ang GPS. Hindi ka makikita ng mga pasahero. |
| Forced offline | Na-offline ka: {reason}. |

**Glossary additions:** **Sundo** = pickup, used in driver-facing labels, where it reads more naturally to drivers ("susunduin"). **Hatid** = the trip to the destination. **Tanggapin / Laktawan** = accept / skip (not "decline", which sounds like refusing the passenger personally).

---

## 9. Open decisions and anti-goals

**Open decisions:**

| # | Decision | Default until decided |
|---|---|---|
| 1 | Should frequent skipping affect a driver (e.g. fewer offers)? | No effect in the MVP; skips are only recorded |
| 2 | A daily earnings goal set by the driver | Out of scope |
| 3 | Break mode ("pahinga") separate from Offline | No, Offline covers it |

**Anti-goals:**
- A small switch as the main control of a driver's working day.
- A request alert that can be missed with the phone in a pocket.
- A fake urgency countdown unrelated to the real request expiry.
- A map that follows the driver continuously, redrawing tiles all day on a screen that never sleeps.
- Showing other drivers' positions on the driver's map.
- Showing the passenger's name or phone before accepting.
- Looking "online" when the server has already stopped matching the driver.
