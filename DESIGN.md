---
name: Papaya HatidGo
description: A bright white tricycle ride app for one Philippine town, readable by a 60-year-old driver in the sun.
colors:
  ground: "#ffffff"
  surface: "#f7f3ee"
  line: "#d8cfc6"
  field-line: "#8a7f77"
  papaya-deep: "#c2410c"
  papaya-deep-pressed: "#9a3412"
  papaya-tint: "#fff1e6"
  papaya-bright: "#f57c00"
  leaf-green: "#2e7d32"
  leaf-tint: "#e8f5e9"
  ink: "#1c1714"
  ink-soft: "#5a4f47"
  on-orange: "#ffffff"
  alert: "#b42318"
  alert-ground: "#fef0ee"
typography:
  display:
    fontFamily: "'Atkinson Hyperlegible Next', Roboto, sans-serif"
    fontSize: "clamp(2rem, 11vw, 2.5rem)"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "'Atkinson Hyperlegible Next', Roboto, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 800
    lineHeight: 1.15
  title:
    fontFamily: "'Atkinson Hyperlegible Next', Roboto, sans-serif"
    fontSize: "1.1rem"
    fontWeight: 700
    lineHeight: 1.2
  body:
    fontFamily: "'Atkinson Hyperlegible Next', Roboto, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.45
    fontFeature: "tnum"
  lead:
    fontFamily: "'Atkinson Hyperlegible Next', Roboto, sans-serif"
    fontSize: "1.05rem"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "'Atkinson Hyperlegible Next', Roboto, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.3
rounded:
  md: "16px"
  full: "50%"
spacing:
  xs: "6px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.papaya-deep}"
    textColor: "{colors.on-orange}"
    typography: "{typography.title}"
    rounded: "{rounded.md}"
    padding: "0 20px"
    height: "60px"
    width: "100%"
  button-primary-pressed:
    backgroundColor: "{colors.papaya-deep-pressed}"
    textColor: "{colors.on-orange}"
  button-outline:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.papaya-deep}"
    typography: "{typography.title}"
    rounded: "{rounded.md}"
    padding: "0 20px"
    height: "60px"
    width: "100%"
  button-outline-pressed:
    backgroundColor: "{colors.papaya-tint}"
    textColor: "{colors.papaya-deep}"
  button-text:
    textColor: "{colors.papaya-deep}"
    typography: "{typography.title}"
    height: "56px"
    width: "100%"
  field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 12px 0 16px"
    height: "60px"
  role-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.title}"
    rounded: "{rounded.md}"
    padding: "16px 8px"
    height: "104px"
  role-card-selected:
    backgroundColor: "{colors.papaya-tint}"
    textColor: "{colors.ink}"
  notice-alert:
    backgroundColor: "{colors.alert-ground}"
    textColor: "{colors.alert}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "14px 16px"
  notice-ok:
    backgroundColor: "{colors.leaf-tint}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "14px 16px"
  toolbar:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink}"
    height: "60px"
---

# Design System: Papaya HatidGo

## Overview

**Creative North Star: "Readable in the Noon Sun"**

A calm, bright, white ride app that an older tricycle driver can read outdoors, one-handed, on a low-end Android phone. The look is the user's own mockup, pinned as canon: clean white screens, deep papaya orange for the one next action, papaya-leaf green for the brand and for success, and the tricycle + papaya-leaf logo. Everything else is white space and big near-black text.

Density is low on purpose. One family (Atkinson Hyperlegible Next, built for low-vision readers) sits on an 18px root, so the smallest text is 18px and nothing is ever below 16px. Controls are full-width, soft-cornered and tall (56px minimum, 60px for buttons and fields). Labels stay above their fields, examples are written as "hal. ..." (Taglish) or "e.g. ..." (English), and every state carries a mark as well as a color.

The app is always white. There is no dark scheme: the status bar always uses dark icons (Capacitor StatusBar `Style.Light`), and a phone in dark theme still shows the white app. A night mode may return later only as an explicit in-app user setting, never by following the system.

**Key Characteristics:**
- White ground, warm off-white fields, near-black warm ink.
- One orange primary action per screen; green only for brand and success.
- Atkinson Hyperlegible Next 400/700/800, 18px root, never below 16px.
- Tall, full-width, 16px-radius controls; flat, no shadows.
- States shown by mark plus color; English or Taglish copy (user setting) with "hal." / "e.g." examples.

## Colors

A white, sun-proof palette: one deep papaya orange that carries white text, one leaf green, and warm tinted neutrals (never cool gray).

### Primary
- **Deep Papaya** (#c2410c): every primary button, text-button link, outline-button border, focused field highlight, selected role card border and icon, the "Papaya" half of the wordmark, text selection, input caret. White on it is 5.18:1. Pressed state is **Ripe Papaya Pressed** (#9a3412).
- **Papaya Tint** (#fff1e6): selected role card ground, outline button pressed ground, the disc behind the logo on Get Started.
- **Bright Papaya** (#f57c00): logo artwork only (sidecar body, wheel hubs). White on it is 2.7:1, so it never sits behind text and is never used as text.

### Secondary
- **Papaya Leaf** (#2e7d32): the "HatidGo" half of the wordmark, success notice border and icon, the selected-state check mark. 5.13:1 on white.
- **Leaf Tint** (#e8f5e9): success notice ground.

### Neutral
- **White Ground** (#ffffff): every screen, the toolbar, outline button ground.
- **Warm Field** (#f7f3ee): input and role card ground.
- **Field Line** (#8a7f77): field and unselected card borders; 3.9:1, meeting the 3:1 rule for control boundaries.
- **Hairline** (#d8cfc6): decorative dividers only, never a control boundary.
- **Ink** (#1c1714): reading text, headings, labels, back button, focus ring. 17.8:1 on white.
- **Soft Ink** (#5a4f47): secondary text, leads, hints, placeholders, step counters. 7.9:1 on white.
- **Alert** (#b42318) on **Alert Ground** (#fef0ee): errors only, always with an icon. 6.6:1 on white.

### Named Rules
**The One Orange Rule.** Each screen has exactly one filled orange button: the next action. Every other way forward is an outline or text button.

**The Bright Papaya Stays in the Logo Rule.** #f57c00 appears only inside the logo artwork. Any orange behind or as text is #c2410c.

**The Always White Rule.** The app does not follow the system dark theme. Status bar icons are always dark.

## Typography

**Display Font:** Atkinson Hyperlegible Next (with Roboto, sans-serif), self-hosted at 400, 700 and 800 so it works offline.

**Character:** One hyperlegible family whose I/l/1 and O/0 never collide; weight, not a second face, carries hierarchy. Numbers are tabular everywhere so fares, phone numbers and codes line up.

### Hierarchy
- **Display** (800, clamp(2rem, 11vw, 2.5rem), ~40px, 1.1, -0.01em): the wordmark on Get Started only; fits one line on a 360dp phone.
- **Headline** (800, 1.75rem ~32px, 1.15, balanced wrap): one page heading per screen.
- **Title** (700, 1.1rem ~20px, 1.2): button labels, role card names, typed field text (400).
- **Body** (400, 1rem = 18px, 1.4 to 1.45): notices, hints, notes. Leads under headings are 1.05rem soft ink.
- **Label** (700, 1rem = 18px): field labels (ink), step counters like "Hakbang 1 sa 2" (soft ink), field errors (alert). Sentence case, no tracking.

### Named Rules
**The 16px Floor Rule.** No text anywhere is below 16px. The 18px root makes 1rem the working minimum.

**The Labels Stay Rule.** Every field has a visible label above it; placeholders are only examples ("hal. 0917 123 4567" / "e.g. 0917 123 4567", "hal. juan@gmail.com", "hal. 0917 123 4567 o email"), never the label.

## Layout

Single portrait column, full-width controls, a reading column capped at 34rem and centered. Form screens sit under a white 60px toolbar that holds only the back button; the heading lives in the page. Get Started splits the screen: logo, wordmark and one line centered in the open upper area, the two buttons stacked in the bottom thumb zone (14px gap). Safe-area insets are always added to top and bottom padding. Spacing steps are 6, 8, 12, 16, 20 and 24px: 20px between fields, 24px under the page head, 6px between a label, its hint and its field. Side-by-side pairs (first/last name, role cards) use a 12px gap; the name pair stacks below 400px width.

## Elevation & Depth

Flat. No drop shadows anywhere. Depth comes from tonal grounds (white screen, warm off-white fields, tinted selected and notice grounds) and from 2px borders, drawn as inset box-shadows on buttons and notices so they never shift layout.

**The Flat Sun Rule.** Nothing floats. A boundary is a 2px line (3px on a selected card), never a shadow.

## Shapes

One soft radius (16px) on every button, field, card and notice. The only other shape is the full circle of the logo disc. Control borders are 2px Field Line; selected is 3px Deep Papaya. Nothing is sharp-cornered, and nothing you can tap is pill-shaped. The one exception is the small status chip (Phase 7). It is a fully rounded pill on purpose, so a status never looks like a button.

## Components

### Buttons
Big, calm and full-width.
- **Shape:** soft rounded rectangle (16px), 100% wide, 60px minimum height, 20px side padding, label 1.1rem/700, balanced wrap at large system text.
- **Primary:** Deep Papaya ground, white label. Pressed: #9a3412 and a 0.98 scale (160ms, cubic-bezier(0.16, 1, 0.3, 1)).
- **Outline:** white ground, Deep Papaya label and 2px inset border; pressed ground Papaya Tint. The second way forward, same size.
- **Text:** transparent, Deep Papaya label underlined (2px, 5px offset), still 56px tall. For "Nakalimutan ang password?" and similar.
- **Disabled / loading:** 0.55 opacity; loading shows a 22px spinner in the label color.
- **Focus:** 3px Ink outline at 3px offset (orange would vanish on an orange button).
- Taglish compounds like "Mag-login" never break at the hyphen.

### Inputs / Fields
- **Style:** Warm Field ground, 2px Field Line border, 16px radius, 60px tall, typed text 1.1rem Ink, placeholder Soft Ink at full opacity. Label (700) above, optional hint (400, Soft Ink) between label and field.
- **Focus:** border turns Deep Papaya; caret is Deep Papaya.
- **Error:** border turns Alert; below the field one bold Alert line led by an alert-circle icon.

### Role Cards (signature)
Two equal cards side by side ("Pasahero", "Driver"), Warm Field ground, 2px Field Line border, 104px tall, 36px icon over a 1.1rem/700 name. Selected: 3px Deep Papaya border, Papaya Tint ground, orange icon, and a green check-circle in the top-right corner. The driver icon is the authored tricycle (Ionicons-style 32px round strokes, currentColor, viewBox cropped to "40 56 464 464" so it matches person-outline in size).

### Notices
Full-width marked messages: 16px radius, 14px 16px padding, 24px leading icon, 2px inset border. Alert: Alert Ground, Alert text and border, alert-circle icon, `role="alert"`. OK: Leaf Tint ground, Ink text, green border and icon (checkmark-circle or mail-outline). Warn (Phase 7): Papaya Tint ground, Ink text, Deep Papaya border and icon. Use it for a consequence before an action ("a new plate sends your OR/CR and MTOP back to review"), or for "expiring soon".

**Info** (Phase 7–8): Warm Field ground, Ink text, Field Line border, Soft Ink icon. For neutral facts ("this is only a preview", "checking your payment…", "payment cancelled").

### Tags
A small Soft Ink word in a Hairline pill on Warm Field (1rem/700). Labels a fact that isn't a status: "Coming soon" on a menu row, "Test mode: no real money" under Pay. Never tappable.

### Plan Cards (Phase 8)
The Subscription page's plans are radio cards in the Role Card style, full width, 76px minimum. The months (1.15rem/800) sit over a Soft Ink note ("1 month free", "Pay month by month"), with the price on the right (1.3rem/800). The chosen card gets a 3px Deep Papaya border, Papaya Tint and a green check-circle. The others get a Soft Ink empty ring, so every card reads as a choice. One orange "Pay ₱…" follows, with the reassurance line (lock icon) under it. While a payment may still arrive, the plans and Pay are hidden and **Check again** becomes the orange button, so nobody pays twice.

### Status Chips (Phase 7)
A word plus an icon in a small pill (1rem/700, 18px icon, 2px inset border). One kind per meaning, and color is never the only signal:
- **ok:** Leaf Tint, green border and check (Approved / Done).
- **wait:** Warm Field, Field Line border, clock (Under review).
- **fix:** Alert Ground, Alert text and border (Needs fixing / Expired).
- **warn:** Papaya Tint, Deep Papaya (Expiring).
- **missing / locked:** white ground, Hairline border, Soft Ink, with an empty ring or a lock.

The mapping lives in `features/driver/requirement-view.ts`, so Home, the list and the detail screen always agree.

### Photo Slot (Phase 7)
One Warm Field card per side (Front / Back), with a 2px Field Line border and a 16px radius. The side's name sits on top. Below it come one outline "Take a photo" button (camera icon) and two text buttons, "Choose from gallery" and "Upload a PDF instead". Once a photo is taken, the card shows the preview instead, with a "Retake" button. A photo lives only in memory and is never saved to the phone.

### Checklist (Driver Home, Phase 7)
Numbered steps (① tricycle ② documents ③ subscription ④ go online). Each step is a 2px ring with its number, then a title (1.1rem/800), then its status chip *under* the title, so long Taglish never squeezes the row. The documents step lists the 4 papers in a 2-column grid (1 column under 360px), each with its own icon. Rows are split by 2px Hairline. **The one next-step button is pinned in a white footer above the tabs** (`ion-footer`, 2px Hairline top). The driver always sees what to do next without scrolling. When the button is disabled, one Soft Ink line under it says why.

### Action Sheets
Ionic sheets get the class `hg-sheet` (`theme/world.scss`). They use Atkinson, a 1.1rem/800 Ink title, 60px rows and Ink labels. A choice works like a radio button: a green check-circle on a Papaya Tint row for the current choice, and a Soft Ink empty ring for the others, so the labels line up.

### Native Android pickers
The WebView's date picker uses the Android theme (`android/app/src/main/res/values/styles.xml`), which is always Light with Deep Papaya as primary and accent (`colors.xml`). That keeps it white with papaya, never dark or teal. An empty date field shows the app's own prompt, a calendar icon plus "Choose a date", because Android's empty date input shows nothing.

### Navigation
White toolbar, no border, 60px; back button in Ink, 52px target, 28px arrow. No title in the toolbar. **Exception (Phase 10):** on full-bleed map screens (the ride screen), Back floats on the map as a 52px white disc with a 2px Field Line ring, top-left below the status bar. There's no toolbar band, so the driver card fits, and no shadow.

### Map screens (Phase 10)
- **Map:** Leaflet + OpenStreetMap behind `MapService`, with the required "© OpenStreetMap contributors" credit always visible. No zoom buttons (pinch). About 40% of the screen while choosing pins, smaller once the choice or the status matters more.
- **Markers:** CSS + inline SVG, no image files. Pickup = Deep Papaya ring on white. Destination = Ink pin (a rotated square with a white center). Driver = the authored tricycle in a white disc with a papaya ring. The booking screen's **fixed center pin** has the same shapes, larger (the map moves under it).
- **Status-bar scrim:** full-bleed screens put a white strip behind the transparent status bar (`.hg-statusbar-scrim`), so scrolled content never runs under the clock.
- **Pinned footer:** the step's or status's one orange button sits in a white footer above the tab bar (2px Hairline top), as on Driver Home. Notices that qualify it (fare changed, errors) sit just above the button; the estimate line ("This is an estimate. You pay the driver in cash.") sits directly above the price button.

### Ride option cards and choice chips (Phase 10)
The One-way / Balikan cards follow the **Plan Card** rules: full width, 84px minimum, the name (1.15rem/800) over a Soft Ink meaning, the price on the right (1.4rem/800), a green check on the chosen card and an empty Soft Ink ring on the others. **Choice chips** (Balikan wait time, cancel reasons) are 56px tall, Warm Field with a 2px Field Line, at least 8px apart. Chosen = 3px Deep Papaya + Papaya Tint.

### The ride screen (Phase 10)
- **Hierarchy:**
  1. The status line, the page heading (1.75rem/800), readable in one glance.
  2. Body no. + plate, the second-largest text (1.5rem/800, never truncated).
  3. At most one action.
- **Stage track:** dots joined by a 3px line. Done = filled Deep Papaya. Current = papaya ring with the label in Ink 800. To do = Hairline ring. Labels are 1rem and wrap at word breaks. A 6-stage Balikan track shows only the current label (the others stay readable to screen readers).
- **Driver card:** Warm Field, a 2px Hairline ring. A papaya-tint initials avatar (no photos), name, "{color} tricycle", ★ average only from 5 ratings. The **call** button is a 56px **outline** disc (Deep Papaya ring and icon), never green: green means done.
- **Pay line (completed):** the most prominent thing, before the rating: Papaya Tint, a 2px Deep Papaya border, 1.35rem/800.
- **Cancel:** a quiet Soft Ink text button at the very bottom, never next to the call button. It opens the flow's one modal sheet, which holds the **danger button** (`.hg-button--danger`: Alert fill, white text), used only to confirm what can't be undone: cancelling a ride (both roles) and the driver's "End the ride here" (Phase 11).
- **Weak connection:** a slim Alert banner directly above the status line, "Weak connection. Last update: 40 sec ago." The last known status stays on screen.

### Map lines and the live driver (Phase 12)
- **Base map:** MapTiler "Streets" in high resolution (sharp names on dense screens), with the credit "© MapTiler © OpenStreetMap contributors" always visible. OpenStreetMap is the fallback when no key is set.
- **Three lines, told apart by pattern** (`.hg-line--*`, drawn under the markers):
  - **Route** (the planned trip, pickup → destination): Ink at 75%, 3px, dashes 10/8. **Along the roads** since the routing update (after Phase 13): it's the road the fare was measured on. Straight only while the destination pin is being moved (step 2), and on rides booked before the update.
  - **Approach** (the driver coming to the pickup): Deep Papaya dots, 4px. Shown only while the position is live.
  - **Driven path** (a finished ride, the trip part only): solid Deep Papaya, 4px.
- **Booking:** the route appears once both points exist. In step 2 it follows the center pin as the map moves.
- **Live driver marker:** glides ~1 s to each new position (ease-out); under "Remove animations" it jumps.
- **Stale** (older than 45 s): the ring and the tricycle turn Soft Ink at 70% opacity, the approach line disappears, and the distance line becomes "Last location: 2 min ago" with a clock icon. Never an old position shown as live.
- **Fitting pins:** maps leave the status bar + 36px clear at the top and 36px at the bottom (the sheet overlap). The floating back button only covers a corner, so its height isn't reserved across the map.
- **Finished ride:** the passenger's map returns to full height. A finished ride's map is its record.

### Driver at work (Phase 11)
- **Work state as the headline:** "You're offline." / "● You're online" at 2.1rem/800, the largest text on Home. Online carries a Leaf Green dot with a Leaf Tint halo **and** the words (never color alone). A Soft Ink lead says what's happening ("Waiting for passengers…") or why ("You were taken offline." + the reason, with an outline button to the fix).
- **Go online / Go offline:** Go online is the screen's orange button, extra-large (68px, 1.3rem). Online, it becomes an **outline** "Go offline" of the normal size: going offline is rarer, and a mistap costs requests. No confirmation either way.
- **Compact map (online only):** edge to edge, ~32vh, under the status-bar scrim. The sheet overlaps its bottom by 16px with a 16px top radius. The marker moves only with each sent position. "Where am I?" is a 52px white pill with a 2px Field Line ring, bottom-right. No map while offline or with GPS lost.
- **Today card:** Warm Field, 2px Hairline, 64px, "Today: ₱… · n rides" in 1.2rem/800 with a chevron (→ Earnings). It shows "Today: —" until the server answers, never a made-up ₱0.
- **Tips:** Soft Ink lines with a 22px outline icon (battery, volume), no card.
- **Request takeover:** a full-screen white modal, nothing else on screen. **Since the request board (after Phase 13) it opens only when the driver taps a request in the list** (or by auto-accept), never by itself; a new request rings once.
  - The order: title + countdown pill (Papaya Tint, 2px Deep Papaya, tabular numbers) → type tag (Balikan = 3px Ink ring) → **fare 3.5rem/800**, the largest number → Pickup / Drop-off rows (orange outline icons, the landmark in Soft Ink) → note card → actions.
  - Skip (outline) left, Accept (orange, 1.8× wider, 72px) right, 20px apart.
  - "Taken" / "gone" replace the content with a centered Soft Ink mark + the sentence, then close after 3 s.
- **Driver ride screen:** the passenger's ride screen, mirrored. The map is 30vh in every phase. Then the status line, then **where to go** (Sundo / Hatid label with an orange icon, the landmark 1.2rem/800, a 56px outline "Directions" button to Google Maps), then the passenger card (initial, first name, call disc). The footer holds one 68px next-step button. "Collect ₱… (cash)" uses the pay-line style. Back floats on the map only once the ride is over.
- **Period switch (Earnings):** three equal 56px choice chips (Today / This week / This month), chosen = 3px Deep Papaya + Papaya Tint + 800 weight. The total is in a Warm Field card at 3rem/800, the rides below it as the Rides list rows.
- **Sound:** the request tone is the app's only sound (a generated two-note chime). It repeats with a 700ms vibration every 5 s until the driver acts.

### Place search and the cancel window (after Phase 13)
- **Search a place** (Book, steps 1–2): a normal 60px field with a Soft Ink search icon inside and a 56px clear button. Results are 56px+ rows split by 2px Hairline: a Deep Papaya location mark, the name (700), and where it is (Soft Ink). Status lines ("Searching…", nothing found, couldn't search) are Soft Ink, never an alert: the map always still works.
- **A name from the map** fills the landmark with a Soft Ink hint under it: "Named from the map. You can change it." Typing replaces it for good.
- **While the driver is on the way**, the passenger's quiet Cancel text button is replaced by a centred Soft Ink line saying when it opens. When it opens because the driver is late, the cancel sheet starts on "The driver is taking long".

### The request board (after Phase 13)
- **Auto-accept** on Driver Home (online): choice chips Off / 2 km / 3 km / 5 km (56px, chosen = 3px Deep Papaya + Papaya Tint + 800), with a Soft Ink hint when on.
- **Requests near you** + a count pill: one Warm Field card per request (2px Field Line, 16px radius). The fare first and largest (1.5rem/800), the ride type tag (Balikan with the 3px Ink ring, as on the takeover), the pickup landmark (1.1rem/700), then "Pickup: 4.0 km from you · Drop-off: 3.5 km trip" in Soft Ink. Tapping opens the usual request screen, without the tone. Empty: one Soft Ink line.

### Notifications (Phase 13)
- **Alerts tab:** a bell, in both roles (the driver's 5-tab bar sets its labels at the 16px floor with no side padding, so "Earnings" fits at 360dp). Unread count in a Deep Papaya pill with a 2px white ring, "9+" above nine, and "N unread" for screen readers.
- **Alert rows:** a 44px round icon by subject (tricycle, paper, card, power), the time in Soft Ink, a 1.05rem title, the body in Soft Ink. **New** = the word "New" in a papaya pill + an 800 title + a papaya-tint icon + Ink body; read rows are calm. Rows are split by 2px Hairline; the whole row is the button.
- **Notifications off:** an Info notice at the top of Alerts, with an outline "Allow notifications" while Android can still ask, or the Settings path once refused.
- **Permission sheet:** once after login, a bottom sheet with the bell in a 72px papaya-tint disc, a role title ("Know when your driver is here" / "Don't miss a passenger"), one orange "Allow notifications", and "Not now" as a text button.
- **While the app is open:** a push becomes a white toast at the top (2px Field Line ring, title 800, body Soft Ink, a Deep Papaya "View" 56px tall, 10 s), never over the screen that already shows it.
- **Android:** the small icon is the tricycle outline in one color (`ic_stat_tricycle`), tinted Deep Papaya in the shade.

### Logo
Authored SVG: a side-view Philippine tricycle with one roof over sidecar and driver, a papaya leaf growing from the roof. Deep Papaya roof and motorcycle, Bright Papaya sidecar and hubs, leaf greens, Ink wheels and frame, white window. Decorative (`aria-hidden`); the name is always written beside it. On Get Started it sits on a 232px Papaya Tint disc and settles in once (500ms rise and fade, ease-out); under reduced motion it appears instantly.

## Do's and Don'ts

### Do:
- **Do** give every screen exactly one Deep Papaya (#c2410c) filled button for the next action; later screens (booking map, active ride, driver home) follow this too.
- **Do** make every control at least 56px tall and every button and field 60px.
- **Do** keep all text at 16px or larger (1rem = 18px root).
- **Do** put a visible label above every field and use placeholders only for Taglish "hal." examples.
- **Do** show every state by a mark plus color: error icon plus red, check mark plus orange border, success icon plus green border.
- **Do** write copy in plain English and plain Taglish: every text lives in `src/app/core/i18n/messages.en.ts` and `messages.fil.ts` (same keys, enforced by the build), never typed straight into a template.
- **Do** honor prefers-reduced-motion: transitions and the logo rise turn off.
- **Do** keep the app white and the status bar icons dark, whatever the phone theme.

### Don't:
- **Don't** use Bright Papaya (#f57c00) for text or behind text (2.7:1 with white).
- **Don't** signal a state with color alone.
- **Don't** use Hairline (#d8cfc6) as a control border; controls use Field Line (#8a7f77).
- **Don't** add drop shadows; boundaries are 2px lines.
- **Don't** follow the system dark theme; a night mode may come back only as an explicit user setting.
- **Don't** set `inputmode="email"` on a field that also accepts a mobile number.
