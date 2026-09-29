# Phase 1 — Mobile Project Setup (Capacitor + Android)

> **Status:** ✅ Complete (2026-09-29)
> **Goal:** Make the Ionic Angular app run in three places: the browser, the Android emulator, and a physical Android phone.
> **Related:** [environment-setup.md](environment-setup.md) explains JAVA_HOME, ANDROID_HOME and PATH in depth.

---

## 1. Starting point

| Item | State before Phase 1 |
|---|---|
| Project | Ionic 9 + Angular 22 "Blank" starter (standalone components) |
| Git | Repository already on GitHub (`Dosss42/Papaya-HatidGO`) |
| Dependencies | Not installed (no `node_modules/`) |
| Capacitor | Not installed |
| Android project | Did not exist |

---

## 2. Tool versions used

| Tool | Version | Why this version |
|---|---|---|
| Node.js / npm | 26.2 / 11.13 | Angular 22 supports Node `^22.22.3 \|\| ^24.15.0 \|\| >=26.0.0`; Capacitor 8 needs Node ≥ 22 |
| Angular | 22.1 | Came with the starter |
| Ionic | 9 | Came with the starter |
| Capacitor | **8.5.2** | Latest stable at setup time |
| JDK | **21** (Oracle 21.0.12) | Capacitor 8 compiles Java 21, and Gradle 8.14.3 runs on Java ≤ 24. See environment-setup.md. |
| Gradle / Android Gradle Plugin | 8.14.3 / 8.13.0 | Set by Capacitor 8's Android template |
| Android SDK | compileSdk / targetSdk **36**, minSdk **24** | Set by Capacitor 8 (`android/variables.gradle`) |
| Android Studio | 2026 build (AI-261) | Already installed |

---

## 3. Steps performed

All commands were run in `papaya-hatid-go/` unless noted.

### Step 0 — Environment variables
- Installed **JDK 21** and set `JAVA_HOME`.
- Set `ANDROID_HOME` to `C:\Users\ron28\AppData\Local\Android\Sdk`.
- Added `platform-tools` (adb) to the user `PATH`.
- Details and troubleshooting: [environment-setup.md](environment-setup.md).

### Step 1 — Install dependencies
```powershell
npm install
```
Downloads every package listed in `package.json` into `node_modules/`, which is git-ignored.

### Step 2 — Verify in the browser
```powershell
npm start        # ng serve → http://localhost:4200
```
✅ The starter page "Blank / Ready to create an app?" appeared.

### Step 3 — Add Capacitor
```powershell
npm install @capacitor/core
npm install -D @capacitor/cli
npx cap init "Papaya HatidGo" com.papayahatidgo.app --web-dir www
```

| Package / file | Purpose |
|---|---|
| `@capacitor/core` | Runtime bridge between the web code and native Android. Ships inside the app. |
| `@capacitor/cli` | The `npx cap …` development commands (dev dependency) |
| `capacitor.config.ts` | App ID `com.papayahatidgo.app`, name `Papaya HatidGo`, web output folder `www` |

### Step 4 — Add the Android platform
```powershell
npm install @capacitor/android
npx cap add android
```
Created `android/`, a full Android Studio project that loads the web app inside a WebView.
The warning `sync could not run--missing www directory` was expected, because the app hadn't been built yet.

### Step 5 — Build and sync
```powershell
npm run build            # Angular → www/
npx cap sync android     # copy www/ into android/app/src/main/assets/public + update plugins
```

### Step 6 — Run on the emulator
```powershell
npx cap open android     # opens the android/ folder (NOT the project root) in Android Studio
```
1. Waited for the Gradle **sync**. It downloaded Gradle, SDK Platform 36, and Build-Tools 35.
2. Set **Gradle JDK = JAVA_HOME (21)**.
3. Created the emulator **Pixel 8, API 37**.
4. Pressed ▶ Run. `:app:assembleDebug` → `BUILD SUCCESSFUL`.

✅ The app opened on the emulator.

### Step 7 — Run on a physical phone
- Device: **Redmi Note 13 Pro 5G** (model `2312DRA50G`, HyperOS).
- Turned on Developer options and USB debugging, and allowed the PC.
- Xiaomi-specific: also turned on **Install via USB**.
- `adb devices` listed the phone as `device` (authorized).
- Selected the phone in Android Studio and pressed ▶ Run.

✅ The app opened on the phone, in dark mode because the phone uses a dark theme.

### Step 8 — Commit
Committed and pushed to GitHub.
- **Included:** `android/`, `capacitor.config.ts`, `package.json`, `package-lock.json`, `docs/`.
- **Ignored, as intended:** `node_modules/`, `www/`, `android/app/build/`, `android/local.properties`.

---

## 4. Problems encountered and fixes

| # | Problem | Layer | Cause | Fix |
|---|---|---|---|---|
| 1 | JDK 17 installed first | Environment | Capacitor 8 requires Java 21 | Installed JDK 21 |
| 2 | Android Studio's bundled JDK 25 | Environment | Too new for Gradle 8.14.3 | Gradle JDK set to JAVA_HOME (21) |
| 3 | `ANDROID_HOME` showed `…\Sdk\platform-tools` | Environment | An old System variable pointed one folder too deep | Corrected to `…\Android\Sdk` |
| 4 | `adb` not recognized | Environment | `platform-tools` wasn't on PATH, and open terminals keep their old PATH | Added it to the user PATH; restart VS Code or reload PATH |
| 5 | `npm audit`: 1 critical vulnerability | Dev tooling | `vitest` (the test runner) had a known issue | `npm install -D vitest@~4.1.11`, inside Angular's supported range |
| 6 | 3 moderate audit warnings remain | Dev tooling | `uuid` inside `xcode`, a helper `@capacitor/cli` uses for iOS projects only | Accepted: not used by an Android-only project, not shipped in the APK. **Did not** run `npm audit fix --force`, because it would downgrade Capacitor. |
| 7 | "Unsupported browsers" build warning | Build config | The starter's `.browserslistrc` listed browsers Angular 22 no longer supports | Deleted `.browserslistrc` so Angular uses its own default list |
| 8 | "BUILD SUCCESSFUL" but the app didn't open | Tooling (understanding) | That message came from the Gradle **sync**, not the app build | Pressed ▶ Run. The real build is `:app:assembleDebug`. |
| 9 | Emulator screen fully black | Emulator | The emulator screen had turned off, and the first WebView load is slow | Pressed the emulator's power button / waited |
| 10 | An "Import app" cloud page appeared | Not related | A cloud build service's page | Closed it. Builds are done locally, and GitHub wasn't connected to it. |

**Lesson for the case study:** most first-time failures were **environment** problems, not code problems. Checking the environment first (see the health check in environment-setup.md) saves hours.

---

## 5. Daily workflow established

```text
Edit code in VS Code (papaya-hatid-go/)
        ↓
npm start                          → quick check in the browser (http://localhost:4200)
        ↓
npm run build
npx cap sync android               → copy the latest build into the Android project
        ↓
Android Studio (android/) → ▶ Run  → emulator or phone
```

Rules:
- Edit code **only** in VS Code. Never edit `android/app/src/main/assets/public/`, because it's overwritten on every sync.
- Use Android Studio only for building, running, and native settings.

---

## 6. Verification checklist

- [x] Runs in the browser
- [x] Runs on the emulator (Pixel 8, API 37)
- [x] Runs on a physical phone (Redmi Note 13 Pro 5G)
- [x] App ID `com.papayahatidgo.app`, name "Papaya HatidGo"
- [x] Committed and pushed to GitHub
