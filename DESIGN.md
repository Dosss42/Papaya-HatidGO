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
White toolbar, no border, 60px; back button in Ink, 52px target, 28px arrow. No title in the toolbar.

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
