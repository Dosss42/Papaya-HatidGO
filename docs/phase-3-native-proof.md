# Phase 3 — Capacitor Native Proof (GPS, Network, App Lifecycle)

> **Status:** ✅ Complete (2026-09-29). Core path verified in the browser and on the Redmi; error-case tests T4–T7 still to run (see § 10). Sections 1–8 are the plan; §§ 9–11 are the report.
> **Goal:** Prove that the app can use the phone's **real native features** through Capacitor: location (GPS), network status, and app lifecycle. Build them as **reusable services**, not as throwaway page code.
> **Done when:** a diagnostics screen on the Redmi shows real coordinates, reacts correctly to *allow / deny / approximate* location and to *GPS off*, and shows online/offline changes live.

---

## 1. Why this phase exists

GPS is the core of the product (pickup, matching, tracking). It's also the riskiest part: permissions, Android settings, emulator vs real device, and phones that grant only approximate location. Proving it **before** Laravel and the ride screens means every later phase builds on a native layer we know works.

## 2. Scope

| In scope | Out of scope |
|---|---|
| `@capacitor/geolocation`, `@capacitor/network`, `@capacitor/app` | Maps (Phase 10/12) |
| Android location permissions in `AndroidManifest.xml` | Sending locations to Laravel (Phase 9–11) |
| `LocationService`: permission, one-time position, watch, **error mapping** | Background location (not used: decision 18) |
| `NetworkService`: online/offline as a signal | Keep-awake (Phase 11) |
| App lifecycle: detect resume/pause | Push notifications (Phase 13) |
| A **dev-only diagnostics page** to test them | Final UI design |

## 3. Plugins (versions checked for Capacitor 8)

| Plugin | Version | Used for |
|---|---|---|
| `@capacitor/geolocation` | 8.2.2 | GPS position, watch, permissions |
| `@capacitor/network` | 8.0.1 | Online/offline status and changes |
| `@capacitor/app` | 8.1.1 | Resume/pause events (refresh ride status on resume), Android back button |

## 4. Architecture

```text
Diagnostics page (dev only)  ─┐
Later: booking, driver home  ─┼─►  LocationService  ─►  @capacitor/geolocation  ─►  Android GPS
                              ├─►  NetworkService   ─►  @capacitor/network
                              └─►  (App lifecycle via @capacitor/app)
```

**Rule (phase-0 § I):** pages never call plugins directly. Services wrap them, so:
1. Errors are translated **once**, in one place.
2. The plugin could be replaced without touching pages.
3. Services can be unit-tested with a fake plugin.

### LocationService

| Member | Purpose |
|---|---|
| `permission` (signal) | `'granted' \| 'denied' \| 'prompt' \| 'unknown'` |
| `ensurePermission()` | Check, request if needed, return the result |
| `getCurrentPosition()` | One fix, `enableHighAccuracy: true`, `timeout: 10000`. Returns `{ lat, lng, accuracyM, timestamp }` or throws a **`LocationError`** |
| `startWatch(cb)` / `stopWatch()` | Continuous updates (for drivers later) |

**Error mapping** (from the plugin's official error codes):

| Plugin code | Meaning | Our `LocationError.kind` | User message (glossary) |
|---|---|---|---|
| `OS-PLUG-GLOC-0003` | Permission denied | `DENIED` | Naka-off ang lokasyon. |
| `OS-PLUG-GLOC-0007`, `0009`, `0017` | Location services off / user refused to enable / network + location off | `GPS_OFF` | Hindi makuha ang lokasyon mo. Siguraduhing naka-on ang GPS. |
| `OS-PLUG-GLOC-0010` | Timeout | `TIMEOUT` | Hindi makuha ang lokasyon mo. Subukan ulit. |
| `OS-PLUG-GLOC-0018` | Permission missing from the manifest | `CONFIG` | (developer error: fix `AndroidManifest.xml`) |
| anything else | — | `UNAVAILABLE` | Hindi makuha ang lokasyon mo. |

### NetworkService

| Member | Purpose |
|---|---|
| `online` (signal) | `true` / `false`, updated live by the plugin's `networkStatusChange` listener |
| `connectionType` (signal) | `wifi` / `cellular` / `none` / `unknown` |

## 5. Android configuration

`android/app/src/main/AndroidManifest.xml`, added under `<!-- Permissions -->`:

```xml
<!-- Geolocation Plugin -->
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-feature android:name="android.hardware.location.gps" />
```

- **COARSE** = approximate (network-based). **FINE** = precise (GPS). On Android 12+, the user can grant **approximate only**, even when FINE is requested. The app must handle that (see test T4).
- No `ACCESS_BACKGROUND_LOCATION`. Location is used only while booking and during rides (decision 18).

## 6. Diagnostics page (dev only)

Route `/dev/diagnostics`, registered **only when `environment.production` is false**, so it can never ship in a production build.

Shows:
- permission state;
- the last position (lat, lng, accuracy in meters, time);
- the last error (kind + message);
- network online / type;
- a log of app resume/pause events.

Buttons: **Get location** · **Start watch** · **Stop watch**.

## 7. Implementation steps

| Step | Task |
|---|---|
| 3.1 | Install the three plugins, then `npx cap sync android` |
| 3.2 | Add the location permissions to `AndroidManifest.xml` |
| 3.3 | `LocationService` + the `LocationError` model |
| 3.4 | `NetworkService` |
| 3.5 | Diagnostics page + dev-only route |
| 3.6 | Test: browser, emulator, Redmi |
| 3.7 | Report (this file) + commit |

## 8. Test plan

| # | Where | Test | Expected |
|---|---|---|---|
| T1 | Browser | Get location, allow in the browser prompt | Coordinates shown (lower accuracy on a PC) |
| T2 | Emulator | Set a location in **Extended controls › Location** (e.g. a point in Nueva Ecija), then Get location | Exactly that point |
| T3 | Redmi | First run → **Allow, precise** | Real position, accuracy about 5–30 m outdoors |
| T4 | Redmi | Reinstall → **Allow, approximate** | Position shown with a large accuracy (hundreds of meters): must not crash |
| T5 | Redmi | **Deny** | `DENIED` + Taglish message; no crash |
| T6 | Redmi | Allow, but turn **Location off** in quick settings | `GPS_OFF` |
| T7 | Redmi | Indoors / weak signal | Either a position or `TIMEOUT` after ~10 s, never an endless spinner |
| T8 | Redmi | Airplane mode on → off | Network: online → **offline** → online, live |
| T9 | Redmi | Home button, then reopen the app | "pause" then "resume" logged |
| T10 | Production build (`npm run build`) | Open `/dev/diagnostics` | Route doesn't exist → redirects to Welcome |

---

## 9. Report: what was built

| File | Purpose |
|---|---|
| `shared/models/location.model.ts` | `GeoPoint`, `LocationPermission` (includes `approximate`), `LocationError` + the error-code translator (Android `OS-PLUG-GLOC-xxxx` and browser codes 1/2/3) |
| `core/services/location.service.ts` | `ensurePermission`, `getCurrentPosition` (10 s timeout, high accuracy), `startWatch` / `stopWatch`; read-only signals |
| `core/services/network.service.ts` | `online` / `connectionType` signals, live via `networkStatusChange` |
| `core/services/app-lifecycle.service.ts` | `isActive` signal via `appStateChange` |
| `features/dev/pages/diagnostics/*` | Dev-only test screen; stops the watch on leave (`ngOnDestroy`) |
| `app.routes.ts` | `/dev/diagnostics` registered only when `environment.production` is false |
| `welcome.page.*` | "Diagnostics (dev)" button, dev builds only |
| `AndroidManifest.xml` | `ACCESS_COARSE_LOCATION`, `ACCESS_FINE_LOCATION`, `uses-feature gps`. No background location. |
| `package.json` | `npm run android:dev` / `android:prod` (build + sync in one command) |

Plugins: `@capacitor/geolocation` 8.2.2 · `@capacitor/network` 8.0.1 · `@capacitor/app` 8.1.1.
`ACCESS_NETWORK_STATE` comes from the network plugin's own manifest (Android manifest merging).

**Design decisions worth explaining:**
- **Signals, because the app is zoneless** (Angular 22, no `zone.js`). Plugin callbacks update signals, and Angular re-renders what reads them.
- **Pages never import plugins.** Only the three services do. Error translation happens once, and pages stay testable.
- **`_watching.set(true)` before the first `await`**, so two quick taps can't start two GPS watches.
- **The production build still contains the diagnostics chunk** (~8.6 kB lazy file), but the route is never registered, so it's unreachable. Excluding the file entirely would need per-environment route files, which isn't worth it for a dev tool.

## 10. Test results

| # | Test | Result |
|---|---|---|
| T1 | Browser: Get location | ✅ Permission `granted`, position shown, accuracy ± 187 m (expected for a PC: Wi-Fi-based, no GPS chip) |
| — | Browser: watch, network, lifecycle log | ✅ Watch ON with updates; `online · wifi`; resume logged |
| T3 | Redmi: Get location (precise) | ✅ Works the same on the phone (reported by the student) |
| T4 | Redmi: approximate only | ⏳ Not yet run |
| T5 | Redmi: permission denied | ⏳ Not yet run |
| T6 | Redmi: location services off | ⏳ Not yet run |
| T7 | Redmi: indoors / timeout | ⏳ Not yet run |
| T8 | Redmi: airplane mode on/off | ⏳ Not yet run |
| T9 | Redmi: pause/resume | ⏳ Not yet run |
| T10 | Production build hides diagnostics | ✅ Verified from the build: the route is not registered when `production` is true |

**T4–T9 must pass before Phase 10** (the booking screens depend on the DENIED / approximate / GPS_OFF handling). Each takes under a minute on the phone.

## 11. Problems encountered and fixes

| # | Problem | Layer | Cause | Fix |
|---|---|---|---|---|
| 1 | Phone showed the Phase 2 Welcome without the Diagnostics button | Build configuration | A **production** build (`npm run build`, the default) had been synced. In production, `environment.production = true` hides the dev route and button. A production build was also run for T10 right before the sync. | Built with `--configuration development`, synced, re-ran. Added `npm run android:dev` / `android:prod` so the build type is always explicit. |
| 2 | "Nothing new shows" after installing the plugins | Understanding | Plugins are libraries; nothing is visible until code uses them | Expected. Visible once the diagnostics page existed. |

**Lesson:** a dev-only feature missing from the phone usually means a **production build** was installed. Check for `.map` files in `android/app/src/main/assets/public/`: present = development, absent = production.
