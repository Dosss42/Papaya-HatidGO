# Phase 2 — Mobile Architecture

> **Status:** ✅ Complete (2026-09-29). Sections 1–11 are the plan, written **before** implementation (development protocol: Requirement → Design → Plan → Code). Section 12 is the report of what was actually built.
> **Goal:** Give the app its skeleton (folders, pages, routing, guards, models, config, interceptor) with **no real features**.
> **Done when:** a user can move through empty Welcome → Login → Passenger or Driver screens, access is controlled by role, and the structure is ready for every later phase.

---

## 1. Scope

| In scope | Out of scope (later phases) |
|---|---|
| Folder structure (`core/`, `shared/`, `features/`) | Real login against Laravel (Phase 5) |
| Empty pages for auth, passenger, and driver | Any page design or styling (Phase 5, with impeccable) |
| Tab layouts for passenger and driver | GPS, maps, SQLite, payments |
| Routing with lazy loading per feature | Real API calls |
| `AuthService` skeleton with a **fake** login for testing | Secure token storage (Phase 5) |
| Guards: auth, guest, role | |
| `User` / `Role` models | |
| Environment config (`apiUrl`) | |
| HTTP interceptor skeleton | |

---

## 2. Folder structure

```text
src/app/
├── core/                      app-wide, created once, used everywhere
│   ├── guards/                   auth.guard.ts · guest.guard.ts · role.guard.ts
│   ├── interceptors/             auth.interceptor.ts
│   └── services/                 auth.service.ts
├── shared/                    reusable, no business logic
│   ├── components/               (later)
│   ├── models/                   user.model.ts
│   └── utilities/                (later)
├── features/                  one folder per business area
│   ├── auth/
│   │   ├── pages/                welcome · login · register · forgot-password
│   │   └── auth.routes.ts
│   ├── passenger/
│   │   ├── pages/                passenger-tabs · passenger-book · passenger-rides · passenger-account
│   │   └── passenger.routes.ts
│   └── driver/
│       ├── pages/                driver-tabs · driver-home · driver-rides · driver-earnings · driver-account
│       └── driver.routes.ts
├── app.component.ts           root shell
└── app.routes.ts              top level only
```

**Placement rule:**

| Question | Folder |
|---|---|
| Used by the whole app and exists once? | `core/` |
| Reusable, with no business rules? | `shared/` |
| Belongs to one business area? | `features/<area>/` |

**Why feature-oriented:**
1. It mirrors the case study's modules.
2. Each feature is **lazy-loaded**: a passenger never downloads the driver's pages.
3. Changes stay inside one folder.

Folders for `rides/`, `map/`, `profile/`, and `notifications/` are created in the phases that need them, never as empty placeholders.

**Naming convention:** pages inside a role area carry the role as a prefix (`passenger-rides`, `driver-rides`). Both roles have tabs, rides, and account pages, and the prefix keeps class names unique (`PassengerRidesPage` vs `DriverRidesPage`), which makes errors, search results, and imports unambiguous. URLs stay short (`/passenger/rides`), because the feature route files set them.

---

## 3. Route map

| URL | Page | Access |
|---|---|---|
| `/` | → redirect to `/auth/welcome` | — |
| `/auth/welcome` | Welcome | **guest only** (logged-in users are sent to their home) |
| `/auth/login` | Login | guest only |
| `/auth/register` | Register (choose Pasahero / Driver) | guest only |
| `/auth/forgot-password` | Forgot password | guest only |
| `/passenger` | Passenger tabs layout → default `book` | **logged in + role = passenger** |
| `/passenger/book` | Book a ride (home) | passenger |
| `/passenger/rides` | Ride history | passenger |
| `/passenger/account` | Account (profile, subscription, settings) | passenger |
| `/driver` | Driver tabs layout → default `home` | **logged in + role = driver** |
| `/driver/home` | Driver home (eligibility checklist, online/offline) | driver |
| `/driver/rides` | Ride history | driver |
| `/driver/earnings` | Earnings | driver |
| `/driver/account` | Account (profile, requirements, vehicle, subscription) | driver |
| `**` | → redirect to `/` | — |

Routing layers:
- `app.routes.ts` holds only three entries, `auth`, `passenger`, and `driver`. Each one uses `loadChildren` to load that feature's `*.routes.ts` file.
- Each feature's routes file lists its own pages, using `loadComponent` for lazy loading.

The starter `home/` page is **removed** once the new routes work.

---

## 4. Guards

A guard is a function the router runs **before** it opens a route. It returns `true` (allow) or a redirect.

| Guard | Protects | Rule | If it fails |
|---|---|---|---|
| `authGuard` | `/passenger`, `/driver` | Is a user logged in? | → `/auth/login` |
| `roleGuard(role)` | `/passenger` (passenger), `/driver` (driver) | Does the user's role match? | → the user's own home |
| `guestGuard` | `/auth/*` | Is nobody logged in? | → the user's own home |

**Important (from the security design):** guards are **user experience only**. They keep people out of screens that don't apply to them. Real security is enforced by Laravel (middleware and policies) in Phase 5 and later. A modified app can bypass a guard, but it can't bypass the server.

---

## 5. AuthService (skeleton)

Responsibility: **who is logged in, and what role they have.** It's the single source of truth for the session on the mobile side.

| Member | Phase 2 behavior | Later (Phase 5) |
|---|---|---|
| `currentUser` (signal) | Holds a `User` or `null` | Same |
| `isLoggedIn` (computed) | `currentUser() !== null` | Same |
| `role` (computed) | `currentUser()?.role` | Same |
| `fakeLogin(role)` | Sets a sample user, so routing can be tested | **Removed**, replaced by `login(email, password)` → Laravel |
| `logout()` | Clears the user | Also revokes the token on the server |
| `homeUrlFor(role)` | `/passenger` or `/driver` | Same |

**Why Angular signals:** a signal is a value that notifies anything that depends on it when it changes. Guards and pages read `currentUser()` and always get the latest value, without writing subscription code. Signals are current Angular practice.

---

## 6. Models

`shared/models/user.model.ts`:

```text
Role  = 'passenger' | 'driver' | 'admin'      (matches users.role in the ERD)
User  = { id, name, email, phone, role }
```

Only fields needed now. More fields are added when a feature requires them.

---

## 7. Environment config

| File | `apiUrl` | Used when |
|---|---|---|
| `environment.ts` | Local Laravel address (set in Phase 5) | `npm start` / development builds |
| `environment.prod.ts` | Production API (HTTPS) | `ng build` production |

Planned note for Phase 5:
- The emulator reaches your PC at `10.0.2.2`.
- A USB phone reaches it through `adb reverse`, or through the PC's LAN IP. **`localhost` on a phone means the phone itself.**

---

## 8. HTTP interceptor (skeleton)

An interceptor runs on **every** HTTP request the app sends.

| Phase 2 | Phase 5 |
|---|---|
| Registered through `provideHttpClient(withInterceptors([...]))` | Adds `Authorization: Bearer <token>` |
| Passes requests through unchanged | On a `401`, clears the session and goes to login |

Registering it now means no page ever has to handle tokens itself.

---

## 9. Implementation steps

| Step | Task | Commands / files |
|---|---|---|
| 2.1 | Review this structure | — |
| 2.2 | Generate auth pages | `npx ng g page features/auth/pages/{welcome,login,register,forgot-password}` |
| 2.3 | Generate passenger and driver tabs + pages | `npx ng g page features/passenger/pages/passenger-{tabs,book,rides,account}`, `features/driver/pages/driver-{tabs,home,rides,earnings,account}` |
| 2.4 | Move routes into `auth.routes.ts`, `passenger.routes.ts`, `driver.routes.ts`, slim down `app.routes.ts`, delete `home/` | Manual edits |
| 2.5 | `user.model.ts`, `AuthService`, the three guards; temporary "fake login" buttons on the Login page | `npx ng g service core/services/auth`, `npx ng g guard core/guards/...` |
| 2.6 | `apiUrl` in environments, auth interceptor, `provideHttpClient` in `main.ts` | `npx ng g interceptor core/interceptors/auth` |
| 2.7 | Test (below), then commit | — |
| 2.8 | 🎨 First impeccable `shape` sessions | See [IMPECCABLE-GUIDE.md](IMPECCABLE-GUIDE.md) |

**Generator note:** `ng g page` (Ionic schematic) also **adds a route to `app.routes.ts` automatically**. Step 2.4 moves those routes into the feature route files.

---

## 10. Test plan

| # | Test | Expected |
|---|---|---|
| T1 | Open `/` while logged out | Redirects to `/auth/welcome` |
| T2 | Type `/passenger` in the URL while logged out | Redirects to `/auth/login` (authGuard) |
| T3 | Fake-login as passenger | Lands on `/passenger/book`; the tabs switch between Book / Rides / Account |
| T4 | As passenger, type `/driver` in the URL | Redirects back to `/passenger` (roleGuard) |
| T5 | As passenger, open `/auth/login` | Redirects to `/passenger` (guestGuard) |
| T6 | Logout | Returns to `/auth/welcome`; `/passenger` is blocked again |
| T7 | Same as T3–T6, as driver | Driver tabs: Home / Rides / Earnings / Account |
| T8 | Build + sync + run on the Redmi | Same behavior on the phone; the Android back button behaves sensibly |

Expected limitation: the fake login is lost when the app restarts, because nothing is stored yet. Persisting the session is Phase 5 (secure storage) and Phase 6 (SQLite).

---

## 11. Impeccable checkpoint (end of Phase 2)

Once the routes and empty pages exist, run the planning sessions. They produce no code:

1. `/impeccable shape passenger booking flow` (one-way vs two-way)
2. `/impeccable shape active ride screen`
3. `/impeccable shape driver requirements and verification flow`
4. `/impeccable shape driver home screen` (eligibility checklist, online/offline, incoming offer)

Add *"explain why each screen is structured this way"* to each one. The first real visual design happens in **Phase 5** (welcome/login/register), which creates `DESIGN.md`.

---

## 12. Report: what was built

### 12.1 Final structure

```text
src/app/
├── app.component.ts · app.routes.ts
├── core/
│   ├── guards/          auth-guard.ts · guest-guard.ts · role-guard.ts
│   ├── interceptors/    auth-interceptor.ts
│   └── services/        auth.service.ts
├── shared/
│   └── models/          user.model.ts
└── features/
    ├── auth/            auth.routes.ts · pages/{welcome, login, register, forgot-password}
    ├── passenger/       passenger.routes.ts · pages/{passenger-tabs, passenger-book, passenger-rides, passenger-account}
    └── driver/          driver.routes.ts · pages/{driver-tabs, driver-home, driver-rides, driver-earnings, driver-account}
```

The starter `home/` page was removed. The generated `.spec.ts` files were kept for the testing phase.

### 12.2 Commands used

```powershell
npx ng g page features/auth/pages/{welcome|login|register|forgot-password}
npx ng g page features/passenger/pages/passenger-{tabs|book|rides|account}
npx ng g page features/driver/pages/driver-{tabs|home|rides|earnings|account}
npx ng g service core/services/auth --type=service
npx ng g guard core/guards/auth  --implements=CanActivate
npx ng g guard core/guards/guest --implements=CanActivate
npx ng g guard core/guards/role  --implements=CanActivate --skip-tests
npx ng g interceptor core/interceptors/auth
```

### 12.3 Differences from the plan

| Plan | Actual | Reason |
|---|---|---|
| `auth.guard.ts` naming | `auth-guard.ts`, `auth-interceptor.ts` | Angular 22's generator uses a dash. The generated names were kept rather than fighting the tool. |
| Service file `auth.ts` (Angular 22 default) | `auth.service.ts` via `--type=service` | Matches the brief's service naming (AuthService, RideService…) |
| Generated `@Service()` decorator | `@Injectable({ providedIn: 'root' })` | Equivalent behavior; the long-standing form most docs use |
| `role-guard` with a test file | `--skip-tests` | `roleGuard` is a factory (`roleGuard('driver')`), so the generated test template doesn't fit. A proper test comes in Phase 15. |

### 12.4 Problems encountered and fixes

| # | Problem | Layer | Cause | Fix |
|---|---|---|---|---|
| 1 | 10× `TS2339: Property 'isLoggedIn' / 'role' / … does not exist on type 'AuthService'` | Angular / TypeScript (compile) | The AuthService code was pasted into a **new file in the wrong folder** (`shared/models/auth.service.ts`). The real `core/services/auth.service.ts` stayed an empty generated class. | Wrote the code into `core/services/auth.service.ts` and deleted the stray duplicate |
| 2 | Driver account page had no Logout | Feature code | The page was still the generated placeholder | Mirrored the passenger account page as `DriverAccountPage` |
| 3 | The generator added flat routes to `app.routes.ts` (14 routes) | Tooling | The Ionic page schematic always registers new pages at the top level | Moved them into the per-feature `*.routes.ts` files. `app.routes.ts` now has 5 entries. |

**Lessons:**
- **Many identical errors usually have one cause.** Ten errors named the same missing members, so the fix was in the one file that should define them.
- **When a fix "doesn't work", check that the code landed in the right file and was saved.** The editor's unsaved ● dot and the Explorer's file tree are the first things to look at.

### 12.5 Test results

Tested in the browser (`npm start`) and on the Redmi Note 13 Pro 5G (build → sync → Run). Both behaved the same.

| # | Test | Result |
|---|---|---|
| T1 | `/` redirects to Welcome | ✅ |
| T2 | `/passenger` while logged out → `/auth/login` (authGuard) | ✅ |
| T3 | Test login as passenger → `/passenger/book` with tabs | ✅ |
| T4 / T5 | roleGuard / guestGuard redirects | ✅ Logic verified by build and browser. There are no in-app links to blocked areas yet, and typing a URL in the browser reloads the page, which resets the in-memory login. |
| T6 | Logout → Welcome, protected areas blocked again | ✅ |
| T7 | Same flow as driver (4 tabs) | ✅ |
| T8 | Runs on the phone; tabs switch; back button doesn't return to Login after login (`replaceUrl`) | ✅ |

### 12.6 Known limitations (accepted for this phase)

- **Refreshing or restarting logs you out.** The session lives only in memory, in a signal. It will be persisted in Phase 5 (secure token storage) and Phase 6 (SQLite `local_user`).
- **The test login buttons and `fakeLogin()` are temporary.** They're removed in Phase 5.
- **Guards are UX only.** Laravel enforces real authorization from Phase 5 onward.
- **`npm run build` uses the production environment** (`defaultConfiguration: "production"`). To test the phone against a local Laravel in Phase 5, build with `npx ng build --configuration development`.
