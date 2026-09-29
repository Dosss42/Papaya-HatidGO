# Building the APK and Installing It on a Phone

A step-by-step checklist for:

0. [**Quick start: from opening VS Code to seeing your design change on the phone**](#0-quick-start-from-a-design-change-to-the-phone) (read this first)
1. [Opening the existing project in VS Code again](#1-open-the-existing-project-in-vs-code)
2. [Running Papaya HatidGo on the phone over USB](#2-daily-run-papaya-hatidgo-on-the-phone-usb) (what you'll do most days)
3. [Building a real `.apk` file](#3-build-an-apk-file) that you can copy to a phone and install
4. [Turning another web app into an Android app](#4-turn-another-app-into-an-installable-android-app) (for your other app)
5. [**Creating a brand-new app from scratch to APK**](#5-create-a-brand-new-app-from-scratch-to-apk)
6. [Troubleshooting](#6-troubleshooting)

The one-time setup (JDK 21, Android SDK, `JAVA_HOME`, `ANDROID_HOME`, `adb` on PATH) is already done. See [environment-setup.md](environment-setup.md). If something breaks, run the health check in section 7 of that file first.

---

## How the pieces connect

```text
 Angular/Ionic code (src/)
      │  ng build                      → compiles to www/
      ▼
 www/  (HTML, CSS, JS)
      │  npx cap sync android          → copies www/ into android/ + updates plugins
      ▼
 android/  (Android Studio project)
      │  Gradle (Run ▶ or gradlew)     → builds the APK
      ▼
 app-debug.apk ──► installed on the phone (USB via adb, or copied over)
```

**Rule to remember:** every time you change code in `src/`, you must **build + sync again**. Otherwise the phone keeps running the old `www/`.

---

## 0. Quick start: from a design change to the phone

Use this when you've changed a design in VS Code (HTML, SCSS, a component) and want to see it in the app on your phone.

### What "build" and "sync" mean
| Word | What it does | Command |
|---|---|---|
| **Build** | Compiles your Angular code in `src/` into plain HTML/CSS/JS in the `www/` folder | `ng build --configuration development` |
| **Sync** | Copies `www/` into the Android project (`android/app/src/main/assets/public`) and updates native plugins | `npx cap sync android` |
| **Both at once** | The project shortcut in `package.json` | **`npm run android:dev`** |

Android Studio **never reads `src/` directly**. It only sees the copy that sync puts into `android/`. That's why a change you save in VS Code doesn't show up in Android Studio until you build and sync.

### Step 1: Open the project in VS Code
**File → Open Recent → `papaya-hatid-go`**, or in a terminal:
```powershell
cd "C:\Users\ron28\Desktop\Papaya HatidGO\papaya-hatid-go"
code .
```

### Step 2: Open the terminal in VS Code
**Terminal → New Terminal** (`` Ctrl+` ``). Check that it's in the right folder. The prompt should end in `papaya-hatid-go>`.

First time on this PC, or after `git pull` changed `package.json`:
```powershell
npm install
```

### Step 3: Change the design and check it in the browser (optional but fastest)
```powershell
npm start
```
Open `http://localhost:4200`. Press **F12**, then `Ctrl+Shift+M` for phone size. Edit your files and press **Ctrl+S**. The browser refreshes by itself.
When you're happy with the design, stop the server with `Ctrl+C` in the terminal.

### Step 4: Build and sync
```powershell
npm run android:dev
```
Wait until you see:
```text
✔ Copying web assets from www to android\app\src\main\assets\public
✔ Updating Android plugins
[info] Sync finished
```
If the build shows a red **ERROR**, fix that file first. Nothing gets copied to Android until the build passes.

### Step 5: Plug in the phone
Connect it by USB (USB debugging on), then check:
```powershell
adb devices
```
The phone should be listed as `device`.

### Step 6: Put it on the phone
**Option A: Android Studio**
```powershell
npx cap open android
```
Choose your phone at the top and press the green **▶ Run**. If Android Studio is already open, just press **▶ Run** again. You don't need to reopen it.

**Option B: terminal only**
```powershell
npx cap run android
```
Pick your phone and press Enter.

### Step 7: If the screen uses the backend (login, register, …)
Start Laravel in the `papaya-hatidgo-api` window (`php artisan serve`, with WAMP running), then:
```powershell
npm run adb:reverse
```

### Every change after that
You don't repeat Steps 1–2. Just:
```text
edit + Ctrl+S  →  npm run android:dev  →  ▶ Run (or npx cap run android)
```

### When do I need build + sync?
| You changed… | Need `npm run android:dev`? |
|---|---|
| `.html`, `.scss`, `.ts` in `src/` (designs, pages, logic) | ✅ Yes, then ▶ Run |
| Images/fonts in `src/assets/` | ✅ Yes, then ▶ Run |
| Installed a new Capacitor plugin (`npm install @capacitor/...`) | ✅ Yes (sync registers the plugin), then ▶ Run |
| `capacitor.config.ts` | ✅ Yes, then ▶ Run |
| Files inside `android/` (e.g. `AndroidManifest.xml`) | ❌ No. Just ▶ Run. |
| Laravel backend code | ❌ No. The server picks it up on its own. |

---

## 1. Open the existing project in VS Code

You don't create anything new. You just reopen the folder.

**Option A: from VS Code**
1. Open VS Code.
2. **File → Open Recent →** `papaya-hatid-go`.
   If it's not listed: **File → Open Folder…** → pick
   `C:\Users\ron28\Desktop\Papaya HatidGO\papaya-hatid-go` → **Select Folder**.

**Option B: from a terminal**
```powershell
cd "C:\Users\ron28\Desktop\Papaya HatidGO\papaya-hatid-go"
code .
```
`code .` means "open VS Code in this folder". The quotes are needed because the path has a space in it.

**Open the right folder.** Open `papaya-hatid-go` (the folder that has `package.json`), **not** `Papaya HatidGO` above it and **not** `android/`. Commands like `npm run ...` only work from the folder that has `package.json`.

**Open a terminal inside VS Code:** **Terminal → New Terminal** (or `` Ctrl+` ``). It starts in the project folder already.

**The backend** (`papaya-hatidgo-api`, Laravel) is a separate folder. Open it in a **second** VS Code window (**File → New Window → Open Folder**) when you need to run `php artisan serve`.

---

## 2. Daily: run Papaya HatidGo on the phone (USB)

Use this while developing. Android Studio builds a debug APK and installs it for you.

### Step 1: Prepare the phone (only once per phone)
1. **Settings → About phone →** tap **OS version / Build number** 7 times → "You are now a developer".
2. **Settings → Additional settings → Developer options →** turn on:
   - **USB debugging**
   - **Install via USB** (Xiaomi/Redmi/HyperOS only)
3. Plug in the USB cable. On the phone, tap **Allow** on "Allow USB debugging?" (tick "Always allow").

Check it from the VS Code terminal:
```powershell
adb devices
```
You should see something like `XXXXXXXX    device`.
- `unauthorized` → unlock the phone and accept the popup.
- Nothing listed → try another cable or USB port (some cables only charge).

### Step 2: Start the backend (if the screen you're testing uses the API)
In the **papaya-hatidgo-api** VS Code window:
```powershell
php artisan serve
```
Make sure WAMP (MySQL) is running too.

### Step 3: Build and sync the app
In the **papaya-hatid-go** terminal:
```powershell
npm run android:dev
```
This runs `ng build --configuration development` and then `npx cap sync android`.
Use **`android:dev`** for phone testing. It uses `environment.ts` (API = `http://127.0.0.1:8000`). `android:prod` uses `environment.prod.ts`, whose API address is still a placeholder, so login and API calls would fail.

### Step 4: Connect the phone to the Laravel server
```powershell
npm run adb:reverse
```
This forwards the phone's `127.0.0.1:8000` to your PC's port 8000 over USB. Run it again whenever you unplug and replug the phone.

### Step 5: Install and run
**Option A: Android Studio (the way you did it in Phase 1)**
```powershell
npx cap open android
```
1. Wait for the Gradle sync to finish (bottom status bar).
2. At the top, choose your phone from the device dropdown.
3. Press the green **▶ Run**.
4. The app installs and opens on the phone.

**Option B: terminal only (no Android Studio window)**
```powershell
npx cap run android
```
Pick your phone from the list with the arrow keys and press Enter.

### After each code change
```powershell
npm run android:dev
```
Then press **▶ Run** again (or `npx cap run android`). The new version replaces the old one on the phone.

---

## 3. Build an APK file

Use this when you want an actual file, for example to install on a phone without a cable, give to a classmate or panelist, or submit.

### Step 1: Build and sync
```powershell
npm run android:dev
```

### Step 2: Build the APK

**Option A: Android Studio**
1. `npx cap open android`
2. Menu **Build → Build App Bundle(s) / APK(s) → Build APK(s)**.
3. When it's done, click **locate** in the popup.

**Option B: terminal**
```powershell
cd android
.\gradlew assembleDebug
cd ..
```
`gradlew` is the Gradle program that ships inside `android/`. `assembleDebug` means "build the debug APK". The first run is slow while it downloads things. Later runs are faster. Wait for `BUILD SUCCESSFUL`.

### Step 3: Find the file
```text
android\app\build\outputs\apk\debug\app-debug.apk
```
Open that folder quickly with:
```powershell
explorer android\app\build\outputs\apk\debug
```
You can rename the copy you share, for example `PapayaHatidGo-v0.1.apk`.

### Step 4: Install the APK

**With USB (fastest):**
```powershell
adb install -r android\app\build\outputs\apk\debug\app-debug.apk
```
`-r` means "replace the existing app and keep its data".

**Without USB:**
1. Send the `.apk` to the phone (Google Drive, Messenger, Telegram, or copy it over a USB file transfer).
2. On the phone, open it from **Files / Downloads**.
3. Android asks you to allow **"Install unknown apps"** for that app (Files, Chrome, Drive, and so on). Allow it, go back, and tap **Install**.
4. If Play Protect warns "unknown app", tap **More details → Install anyway**. This is normal for apps that aren't from the Play Store.

### Important: the API without USB
A phone that installed the APK **without the cable** can't use `adb reverse`, so `127.0.0.1:8000` points to **the phone itself**, not your PC. Screens that call the API will fail. To demo the full app without a cable:
- Put the PC and phone on the **same Wi-Fi**.
- Run Laravel on all network interfaces: `php artisan serve --host=0.0.0.0 --port=8000`
- Put the PC's Wi-Fi IP (find it with `ipconfig`, e.g. `192.168.1.5`) into `apiUrl` in `src/environments/environment.ts`, and allow that IP in `android/app/src/main/res/xml/network_security_config.xml` (plain `http` is blocked unless it's listed).
- Rebuild: `npm run android:dev` → build the APK again.
- Allow port 8000 through Windows Firewall if the phone still can't connect.

(Later, when the backend is deployed online with HTTPS, you'll put that address in `environment.prod.ts` and use `npm run android:prod`.)

### Debug APK vs release APK
| | Debug APK (what this guide makes) | Release APK |
|---|---|---|
| Signed with | Automatic debug key | Your own keystore (`.jks`) that you create and keep safe |
| Good for | Testing, demos, defense | Play Store / public distribution |
| How | `assembleDebug` | Android Studio **Build → Generate Signed Bundle / APK** |

A debug APK is enough for a school demo. Only make a release build when you actually publish.

---

## 4. Turn another app into an installable Android app

These steps assume your other app is also a **web app** (Angular, Ionic, React, Vue, or plain HTML/JS), the same kind as Papaya HatidGo. Your PC is already set up (JDK 21, Android SDK, adb), so you only do the per-project steps.

Run everything in a terminal **inside that app's folder** (open it in VS Code the same way as [section 1](#1-open-the-existing-project-in-vs-code)).

### Step 1: Make sure the web app builds
```powershell
npm install
npm run build
```
Note the **output folder** it creates:
| Framework | Usual output folder |
|---|---|
| Ionic Angular | `www` |
| Angular (plain) | `dist/<app-name>/browser` |
| React (Vite) / Vue (Vite) | `dist` |
| Create React App | `build` |

### Step 2: Add Capacitor
```powershell
npm install @capacitor/core @capacitor/android
npm install -D @capacitor/cli
npx cap init
```
`npx cap init` asks for:
- **App name**: what shows under the icon, e.g. `My Other App`.
- **App ID**: a unique reverse-domain name, e.g. `com.yourname.otherapp`. Lowercase letters, no spaces, and **it can't be changed easily later**.
- **Web asset directory**: the output folder from Step 1 (e.g. `dist`).

This creates `capacitor.config.ts`. Open it and check that `webDir` matches the output folder.

### Step 3: Add the Android platform
```powershell
npx cap add android
```
This creates the `android/` folder, a real Android Studio project.

### Step 4: Build, sync, run
```powershell
npm run build
npx cap sync android
npx cap open android
```
In Android Studio:
1. Wait for the Gradle sync.
2. **File → Settings → Build, Execution, Deployment → Build Tools → Gradle → Gradle JDK =** `JAVA_HOME` (JDK 21). Do this once per project.
3. Select your phone → **▶ Run**.

### Step 5: Get the APK
Same as [section 3](#3-build-an-apk-file): `cd android; .\gradlew assembleDebug` → `android\app\build\outputs\apk\debug\app-debug.apk`.

### Optional: add npm shortcuts
In that app's `package.json` → `"scripts"`:
```json
"android": "npm run build && npx cap sync android"
```
Then each update is just `npm run android` → **▶ Run**.

### If the other app is *not* a web app
| App type | How to get the APK |
|---|---|
| Native Android (Java/Kotlin, opened in Android Studio) | Open the project folder in Android Studio → **▶ Run**, or **Build → Build APK(s)**. No Capacitor needed. |
| Flutter | `flutter build apk` → `build\app\outputs\flutter-apk\app-release.apk` |
| React Native | `cd android; .\gradlew assembleDebug` |
| Expo | `npx expo run:android`, or `eas build -p android --profile preview` |

---

## 5. Create a brand-new app from scratch to APK

Use this when you start a **completely new** app (nothing exists yet) and want it on your phone as an APK. It uses the same tools as Papaya HatidGo: **Ionic + Angular + Capacitor**.

You only need the PC setup once. Papaya HatidGo already did it, so on this PC you can skip to Step 1.
| Needed | Check with | Expected |
|---|---|---|
| Node.js (LTS) | `node -v` | `v22.x` or newer |
| JDK 21 | `java -version` | `21.x` |
| Android Studio + SDK | `echo $env:ANDROID_HOME` | `C:\Users\ron28\AppData\Local\Android\Sdk` |
| adb | `adb version` | `Android Debug Bridge ...` |

### Step 1: Install the Ionic CLI (once per PC)
```powershell
npm install -g @ionic/cli
ionic -v
```
The Ionic CLI is the program that creates new Ionic projects. `-g` installs it for the whole PC, not just one project.

### Step 2: Create the project
Go to the folder where you keep projects, then create the app:
```powershell
cd "C:\Users\ron28\Desktop"
ionic start my-new-app tabs --type=angular --capacitor
```
| Part | Meaning |
|---|---|
| `my-new-app` | Folder name. Lowercase, no spaces. |
| `tabs` | Starter template: `tabs`, `sidemenu`, or `blank` |
| `--type=angular` | Use Angular (same as Papaya HatidGo) |
| `--capacitor` | Include Capacitor so it can become an Android app |

If it asks questions:
- **Standalone or NgModules?** → **Standalone** (what Papaya HatidGo uses)
- **Create a free Ionic account?** → **No**

It downloads packages. Wait until it says `Your Ionic app is ready!`

### Step 3: Open it in VS Code
```powershell
cd my-new-app
code .
```
From now on, use the terminal **inside VS Code** (`` Ctrl+` ``).

### Step 4: Run it in the browser first
```powershell
npm start
```
Open `http://localhost:4200` (or the address it prints). You should see the starter tabs. Press `Ctrl+C` to stop it.

### Step 5: Set the app name and App ID (before adding Android)
Open `capacitor.config.ts` and change:
```ts
appId: 'com.yourname.mynewapp',   // unique, lowercase, reverse-domain; hard to change later
appName: 'My New App',            // the name shown under the icon
webDir: 'www',
```
Set these **now**. The App ID is copied into the Android project in the next step, and the phone uses it to tell apps apart.

### Step 6: Add Android
```powershell
npm install @capacitor/android
npm run build
npx cap add android
```
- `npm install @capacitor/android` downloads Capacitor's Android part.
- `npm run build` creates `www/`. `cap add` needs it to exist.
- `npx cap add android` creates the `android/` folder, a real Android Studio project.

### Step 7: Add a build-and-sync shortcut
In `package.json` → `"scripts"`, add:
```json
"android:dev": "ng build --configuration development && npx cap sync android"
```
Now every update is one command: `npm run android:dev` (same as Papaya HatidGo).

### Step 8: Run it on the phone
Plug in the phone (USB debugging on, see [section 2, Step 1](#step-1-prepare-the-phone-only-once-per-phone)), then:
```powershell
adb devices
npm run android:dev
npx cap open android
```
In Android Studio:
1. Wait for the Gradle sync.
2. **File → Settings → Build, Execution, Deployment → Build Tools → Gradle → Gradle JDK = `JAVA_HOME` (21)**. Do this once per project.
3. Choose your phone → **▶ Run**.

The app opens on the phone.

### Step 9: Build the APK file
```powershell
npm run android:dev
cd android
.\gradlew assembleDebug
cd ..
explorer android\app\build\outputs\apk\debug
```
Your file is **`app-debug.apk`**. Install it with `adb install -r android\app\build\outputs\apk\debug\app-debug.apk`, or send it to the phone and tap it ([section 3, Step 4](#step-4-install-the-apk)).

### Step 10 (optional): Your own app icon and splash screen
1. Make a **1024 × 1024 PNG** icon and save it as `assets/icon.png` in the project root (the folder with `package.json`, not `src/assets`).
2. Optional: `assets/splash.png` (2732 × 2732) and `assets/splash-dark.png`.
3. Run:
   ```powershell
   npm install -D @capacitor/assets
   npx capacitor-assets generate --android
   ```
4. Build the APK again (Step 9).

### Step 11: Save it with Git
```powershell
git init
git add .
git commit -m "Create new app with Ionic + Capacitor Android"
```
The starter's `.gitignore` already skips `node_modules/`, `www/`, and the Android build folders.

### Summary: from nothing to APK
```text
npm install -g @ionic/cli                          (once per PC)
ionic start my-new-app tabs --type=angular --capacitor
cd my-new-app; code .
edit capacitor.config.ts  (appId + appName)
npm install @capacitor/android
npm run build
npx cap add android
npm run android:dev
npx cap open android → Gradle JDK 21 → ▶ Run      (test on phone)
cd android; .\gradlew assembleDebug; cd ..         (make the APK)
→ android\app\build\outputs\apk\debug\app-debug.apk
```

---

## 6. Troubleshooting

| Problem | Likely cause | Fix |
|---|---|---|
| Phone runs the **old version** | Forgot to build and sync | `npm run android:dev`, then ▶ Run again |
| `adb` not recognized | PATH not loaded in this terminal | Restart VS Code (see [environment-setup.md §6](environment-setup.md#6-problems-hit-during-setup-and-the-fixes)) |
| Phone not in the device list | USB debugging off, popup not accepted, or bad cable | `adb devices`. Accept the popup, change the cable or port. |
| `INSTALL_FAILED_UPDATE_INCOMPATIBLE` | An APK signed by a different PC's debug key is already installed | Uninstall the app from the phone, then install again |
| `INSTALL_FAILED_USER_RESTRICTED` (Xiaomi) | "Install via USB" is off | Developer options → turn on **Install via USB** |
| "App not installed" when tapping the APK | An older copy with a different signature exists, or not enough storage | Uninstall the old app first |
| `invalid source release: 21` / `Unsupported class file major version` | Wrong JDK | Gradle JDK must be **21** ([environment-setup.md §3](environment-setup.md#3-java_home)) |
| Login or API calls fail on the phone | Laravel not running, or `adb reverse` not done | `php artisan serve` + `npm run adb:reverse` |
| Screen is blank/white on the phone | JS error | Chrome on PC → `chrome://inspect` → **inspect** the app's WebView → Console tab |
| `sync could not run--missing www directory` | Never built | `npm run build` first |

---

## Cheat sheet

```powershell
# Open project
cd "C:\Users\ron28\Desktop\Papaya HatidGO\papaya-hatid-go"; code .

# Everyday phone test (USB)
adb devices
npm run android:dev
npm run adb:reverse
npx cap run android              # or: npx cap open android → ▶ Run

# Make an APK file
npm run android:dev
cd android; .\gradlew assembleDebug; cd ..
explorer android\app\build\outputs\apk\debug
adb install -r android\app\build\outputs\apk\debug\app-debug.apk
```
