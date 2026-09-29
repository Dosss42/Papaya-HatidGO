# How to Use Impeccable in Papaya HatidGO

This guide covers when and how to use the **impeccable** design skill while building Papaya HatidGO (Ionic Android app plus a separate admin web dashboard).

> **Main rule:** design comes before code, and layout comes after structure.
> Plan a flow with `shape`, build the screen, then refine it. Don't use `layout` on a screen that doesn't exist yet.

---

## 1. The two context files

Impeccable reads two files before every design decision. Keep both up to date.

| File | Created by | What it holds | When to update |
|---|---|---|---|
| `PRODUCT.md` | `/impeccable init` | Who the users are, what the app does, brand tone, platform (android), scope | When the brief changes (new features, scope decisions) |
| `DESIGN.md` | The first real screen build, or `/impeccable document` | Colors, fonts, spacing, components: the app's visual system | After the first screen is built; re-run `document` if the look changes on purpose |

If `PRODUCT.md` is out of date, every later suggestion will be based on the wrong brief.

---

## 2. Commands by project phase

### Now: refresh the product brief

```
/impeccable init
```

Re-runs the product interview and rewrites `PRODUCT.md`. Do this **before anything else**.

### Phases 0–2: planning (no code yet)

```
/impeccable shape <flow name>
```

Plans the UX of one flow: screens, states, what goes where, and edge cases. **It writes no code**, so it fits the "design before build" rule.

Suggested order of flows to shape:

1. `/impeccable shape passenger booking flow` (one-way vs two-way)
2. `/impeccable shape active ride screen`
3. `/impeccable shape driver requirements and verification flow`
4. `/impeccable shape driver home screen` (online/offline + incoming request)

Tip: add *"and explain why each screen is structured this way"* so the output teaches you instead of just handing you answers.

### Phase 7: the first real screen

Ask normally, no command needed:

```
build the passenger home and booking screen
```

This first build **decides the app's look** (colors, fonts, spacing, components) and saves it to `DESIGN.md`. Every later screen follows it. Since `PRODUCT.md` says **android**, it follows Android/Material conventions.

### After each screen exists: the refinement loop

Run these on **one screen at a time**, in this order:

| Step | Command | What it does |
|---|---|---|
| 1 | `/impeccable critique <page>` | UX review with scores, so you know what to fix and why |
| 2 | `/impeccable layout <page>` | Fixes spacing, grouping, alignment, and visual hierarchy |
| 3 | `/impeccable clarify <page>` | Improves Taglish labels, buttons, and error messages |
| 4 | `/impeccable harden <page>` | Adds missing states (see checklist below) |
| 5 | `/impeccable adapt <page>` | Checks small and large Android screens and one-handed reach |
| 6 | `/impeccable audit <page>` | Technical check: accessibility, contrast, touch-target size, performance |
| 7 | `/impeccable polish <page>` | Final pass before a demo or defense |

You don't have to run all seven every time. At minimum, use **critique → layout → harden → polish**.

### Anytime during development

```
/impeccable live
```

Run `ionic serve`, click an element in the browser, and impeccable generates layout alternatives for you to pick from. This helps when you're unsure how a section should look.

### Phase 12: admin dashboard

```
/impeccable init     (run inside the admin project folder)
```

The admin dashboard is a **web app with a different job** (operators, not riders), so it needs its own `PRODUCT.md` and `DESIGN.md`. Don't reuse the mobile app's files.

---

## 3. `harden` checklist for HatidGO

When running `harden`, make sure these states exist where they apply:

- [ ] GPS / location permission denied
- [ ] No internet / connection lost mid-ride
- [ ] No driver found / booking timed out
- [ ] Driver requirements expired or pending verification
- [ ] Subscription expired
- [ ] Empty states (no ride history, no notifications)
- [ ] Loading states for every network call
- [ ] Payment failed

---

## 4. Other useful commands

| Command | Use it when |
|---|---|
| `/impeccable document` | You want `DESIGN.md` regenerated from the code that exists now |
| `/impeccable extract <target>` | The same button/card is repeated and should become a shared component |
| `/impeccable onboard <target>` | Designing first-run screens, sign-up, or empty states |
| `/impeccable typeset <target>` | Text hierarchy feels flat or hard to read |
| `/impeccable distill <target>` | A screen feels cluttered |
| `/impeccable optimize <target>` | A screen feels slow or janky |
| `/impeccable` (no argument) | You're not sure which command fits; it shows a menu based on your project |

---

## 5. Do's and don'ts

**Do**
- Build **one screen at a time**, then refine it before moving on.
- Ask impeccable to **explain its choices** (this is a learning project, not vibe coding).
- Keep `PRODUCT.md` current; update it when scope decisions are made.
- Review every change before accepting it.

**Don't**
- Run `layout` on the blank "Ready to create an app?" starter. There's nothing to arrange yet.
- Design all 40+ screens at once.
- Let the admin dashboard share the mobile app's design context.
- Skip `shape` for complex flows (booking, active ride, driver verification).

---

## 6. Current next steps

1. **Update `PRODUCT.md`** (`/impeccable init`). Add:
   - Two-way rides
   - Driver compliance module
   - Passenger/driver subscriptions with `PaymentService`
   - Safety features, complaints, audit logs
   - MVP priority list
   - Open questions:
     - The brief says basic account access shouldn't be blocked by subscriptions. **Should passenger subscriptions exist in the MVP at all?**
     - **Is the two-way waiting fee used or not?**
2. **Rework the Phase 0 analysis** into the new A–L structure (requirements workflow, ride types, subscriptions, notifications, security, testing). The ERD grows to about 20 tables.
3. **Start shaping flows** (Section 2, Phases 0–2).

---

## Quick reference

```
Plan    →  /impeccable init   →  /impeccable shape <flow>
Build   →  "build the <screen>"   (first build sets DESIGN.md)
Refine  →  critique → layout → clarify → harden → adapt → audit → polish
Explore →  /impeccable live
```
