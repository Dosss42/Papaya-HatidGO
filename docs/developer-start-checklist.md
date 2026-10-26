# Papaya HatidGo — Before You Start Developing

What to do each time you open the project to work on it, before trying anything.

For a **demo**, use [operating-guide.md](operating-guide.md) instead. To understand the three folders, see [system-structure.md](system-structure.md).

---

## Step 1. Start the backend (always first)

### 1a. WAMP (the database)

1. Open **WampServer**.
2. Wait until its taskbar icon is **green**.

### 1b. The API

```text
cd "C:\Users\ron28\Desktop\Papaya HatidGO\papaya-hatidgo-api"
php artisan serve
```

**Check it:** open http://127.0.0.1:8000/api/v1/health. It should show `"status":"ok"`.

> Keep this terminal open while you work. The mobile app and the admin website both need it.

---

## Step 2. Choose where to test

### A. In the browser (fastest: screens, texts, forms)

```text
cd "C:\Users\ron28\Desktop\Papaya HatidGO\papaya-hatid-go"
npm start
```

1. Open **http://localhost:4200**.
2. It updates by itself every time you save a file.
3. To see it at phone size: press **F12**, then turn on the phone view (the phone-and-tablet icon).

> The browser can't use the camera (paper photos), real GPS, push notifications, or Android's permission dialogs. Use B for those.

### B. On the phone or emulator (GPS, camera, notifications, the real feel)

**1. Connect the devices**
- Phone: plug it in with USB and unlock it. If asked, allow USB debugging.
- Emulator: Android Studio → **Device Manager** → ▶ **Pixel_8**.

**2. Connect them to the API: every time you plug in the phone or start the emulator**

```text
cd "C:\Users\ron28\Desktop\Papaya HatidGO\papaya-hatid-go"
npm run adb:reverse
```

It must list your devices, for example:

```text
✔ a014e6ac: device 127.0.0.1:8000 → this PC :8000        ← your phone
✔ emulator-5554: device 127.0.0.1:8000 → this PC :8000   ← the emulator
```

> **If you skip this, the app shows "No internet"** even when your Wi-Fi works. During development, the app reaches the API through the USB cable, not the internet.

**3. Only if you changed the app's code: rebuild and reinstall**

```text
cd "C:\Users\ron28\Desktop\Papaya HatidGO\papaya-hatid-go"
npm run android:dev
cd android
.\gradlew assembleDebug
adb -d install -r app\build\outputs\apk\debug\app-debug.apk    ← the phone
adb -e install -r app\build\outputs\apk\debug\app-debug.apk    ← the emulator
cd ..
```

`-d` means the USB phone; `-e` means the emulator. Use both when both are connected.

### C. The admin website (when you work on it)

```text
cd "C:\Users\ron28\Desktop\Papaya HatidGO\papaya-hatidgo-admin"
npm start
```

1. Open **http://localhost:4300**.
2. Log in as `admin@example.test` / `password`.
3. It updates by itself when you save.

---

## Step 3. The scheduled jobs (only when you need them)

Needed when you test ride requests expiring ("no driver found"), papers expiring, or reminders:

```text
cd "C:\Users\ron28\Desktop\Papaya HatidGO\papaya-hatidgo-api"
php artisan schedule:work
```

---

## Step 4. When you finish

**1. Stop everything:** press **Ctrl+C** in each terminal.

**2. Run the tests of the part you changed:**

| Changed | Command (in that folder) |
|---|---|
| The API | `php artisan test` |
| The mobile app | `npm test -- --watch=false` |
| The admin website | `npm test -- --watch=false` |

(`--watch=false` runs the tests once and stops; without it they keep re-running on every save until Ctrl+C.)

**3. Save your work to GitHub, in the folder you changed:**

```text
git add -A
git commit -m "what you changed"
git push
```

> **Never commit secrets.** `.env`, `map-key.ts`, `google-services.json` and the Firebase key are kept out of git on purpose. If `git status` ever lists one of them, stop and don't commit it.

---

## Which terminals for what

| You're working on | Open |
|---|---|
| Mobile app screens | WAMP + API + `npm start` in `papaya-hatid-go` (browser) |
| Camera, GPS, notifications | WAMP + API + the phone or emulator (`adb:reverse`, then install) |
| The admin website | WAMP + API + `npm start` in `papaya-hatidgo-admin` |
| API rules only | WAMP + API (+ `php artisan test`) |
| A demo | See [operating-guide.md](operating-guide.md) |

---

## When something goes wrong

| You see… | Do this |
|---|---|
| "No internet" in the app on the phone or emulator | `npm run adb:reverse` (and make sure the API terminal is running) |
| `adb: more than one device/emulator` | Add `-d` (phone) or `-e` (emulator) to the `adb` command |
| `adb devices` doesn't list the phone | Unlock it, reconnect the cable, accept "Allow USB debugging" |
| A database error from the API | WAMP isn't green |
| Your change doesn't show on the phone | Rebuild and reinstall (Step 2B.3) |
| The admin website opens on a strange port (e.g. 60152) | Another copy is already running; close the extra terminal |
| Angular asks "Port 4200/4300 is already in use…" | Same: a copy is still running somewhere |
| An old ride stays "Looking for a driver" | Start the scheduled jobs (Step 3) |

---

## Quick checklist

- [ ] WAMP is green
- [ ] API: `php artisan serve`, and the health page says `"status":"ok"`
- [ ] Browser testing: `npm start` → localhost:4200
- [ ] Device testing: phone plugged in / emulator started → **`npm run adb:reverse`**
- [ ] Changed the app's code? → rebuild + `adb -d` / `adb -e install`
- [ ] Admin work: `npm start` in `papaya-hatidgo-admin` → localhost:4300
- [ ] Need expiry or reminders: `php artisan schedule:work`
- [ ] Done: Ctrl+C everywhere → tests → `git add -A` → `git commit` → `git push`
