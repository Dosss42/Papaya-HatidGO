# Papaya HatidGo — Operating Guide

Step by step: how to start the whole system, run a demo, and shut it down.

To understand what each part is, see [system-structure.md](system-structure.md).

**What you need:**
- the PC with WampServer, PHP, Node.js and Android Studio (setup: [environment-setup.md](environment-setup.md));
- your phone, with the app installed (for the passenger);
- the Android emulator **Pixel_8** (for the driver).

---

## Part A — Start the system (each time you turn on the PC)

### Step 1. Start WAMP (the database)

1. Open **WampServer**.
2. Wait until its icon in the taskbar turns **green**.

> If it stays orange or red, MySQL isn't running, and the API will fail.

### Step 2. Terminal 1: start the API

```text
cd "C:\Users\ron28\Desktop\Papaya HatidGO\papaya-hatidgo-api"
php artisan serve
```

**Check it:** open http://127.0.0.1:8000/api/v1/health in a browser. It should show `"status":"ok"`.

### Step 3. Terminal 2: start the scheduled jobs

```text
cd "C:\Users\ron28\Desktop\Papaya HatidGO\papaya-hatidgo-api"
php artisan schedule:work
```

This expires ride requests nobody accepted, expires old papers, and sends the reminders.

### Step 4. Terminal 3: start the admin website

```text
cd "C:\Users\ron28\Desktop\Papaya HatidGO\papaya-hatidgo-admin"
npm start
```

1. Open **http://localhost:4300** in Chrome.
2. Log in as `admin@example.test` / `password`.

> Keep all three terminals open. Closing one stops what it runs.

---

## Part B — Prepare the phones

### Step 5. Start the emulator (driver)

1. Open **Android Studio** and go to **Device Manager**.
2. Press ▶ on **Pixel_8**.
3. Wait until its home screen appears.

### Step 6. Plug in your phone (passenger)

1. Connect it to the PC with a USB cable.
2. Unlock it.
3. If it asks **"Allow USB debugging?"**, tap **Allow**.

### Step 7. Connect both devices to the API

In a 4th terminal:

```text
cd "C:\Users\ron28\Desktop\Papaya HatidGO\papaya-hatid-go"
adb devices
npm run adb:reverse
```

`adb devices` must list **both** devices, for example:

```text
a014e6ac        device     ← your phone
emulator-5554   device     ← the emulator
```

> Run `npm run adb:reverse` again whenever you unplug the phone or restart the emulator.

### Step 8. Open the app and log in

| Device | Account | Password |
|---|---|---|
| Your phone (passenger) | `pasahero1@example.test` | `password` |
| The emulator (driver) | `driver1@example.test` | `password` |

Allow notifications on both when asked.

---

## Part C — Run the demo

### Step 9. Put the driver near the passenger

On the emulator:
1. Open **⋯ (Extended controls)** → **Location**.
2. Pick a spot near your phone.
3. Press **Set location**.

> Requests go only to drivers within **3 km** of the pickup.

### Step 10. Driver goes online

On the emulator's Home screen, tap **Go online**.

### Step 11. Passenger books a ride

On your phone:
1. Set the pickup.
2. Set the destination.
3. Choose One-way or Balikan.
4. Tap **Mag-book**.

The request appears on the driver's screen.

### Step 12. Driver does the ride

The driver taps **Accept**, then each step in order:
- Papunta na
- Nandito na
- Sakay na
- Tapos

Lock your phone or put the app in the background: the notifications still arrive ("Papunta na ang driver mo", "Nandito na…", "Tapos na ang biyahe").

### Step 13. Show the admin website

In Chrome:
- **Rides**: the live map with the online driver and the active ride;
- **Dashboard**: today's numbers;
- **Verification**, **Reports**, **Audit log**: if the panel asks.

---

## Part D — Shut down

### Step 14. Driver goes offline

On the emulator, tap **Go offline**.

### Step 15. Stop everything

1. In each terminal, press **Ctrl+C**.
2. Close the emulator.
3. Close WampServer.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| The app can't log in, or says "no internet" | The API isn't running (Step 2), or run `npm run adb:reverse` again (Step 7) |
| `adb: more than one device/emulator` | Add `-d` for the phone or `-e` for the emulator, e.g. `adb -d install …` |
| `adb devices` doesn't show the phone | Unlock the phone, reconnect the cable, accept "Allow USB debugging" |
| Booking says you're **outside the service area** | In the admin website, open **Fares & settings** and set the service area center to your town |
| The driver gets no request | The driver isn't online (Step 10), or is more than 3 km from the pickup (Step 9) |
| The API shows a database error | WAMP isn't green (Step 1) |
| The admin website opens on a strange port (e.g. 60152) | Another copy is already running; close the extra terminal and keep only one |
| No push notifications | Allow notifications for the app (phone Settings › Apps › Papaya HatidGo › Notifications); the app still works without them |
| An old ride request stays "Looking for a driver" | The scheduled jobs aren't running (Step 3) |

---

## After changing the app's code

You only need this after you **change the mobile app's code**, not for a normal demo. Run it inside `papaya-hatid-go`:

```text
npm run android:dev
cd android
.\gradlew assembleDebug
adb -d install -r app\build\outputs\apk\debug\app-debug.apk    ← the phone
adb -e install -r app\build\outputs\apk\debug\app-debug.apk    ← the emulator
cd ..
npm run adb:reverse
```

Details: [building-apk-and-installing.md](building-apk-and-installing.md).

---

## Quick checklist (print this)

- [ ] 1. WAMP is green
- [ ] 2. Terminal 1: `php artisan serve` (API)
- [ ] 3. Terminal 2: `php artisan schedule:work`
- [ ] 4. Terminal 3: `npm start` (admin) → http://localhost:4300
- [ ] 5. Emulator Pixel_8 started
- [ ] 6. Phone plugged in, USB debugging allowed
- [ ] 7. `npm run adb:reverse`, and both devices listed
- [ ] 8. Phone: passenger · Emulator: driver
- [ ] 9. Driver's location set near the phone
- [ ] 10. Driver: **Go online**
- [ ] 11. Passenger: **Mag-book**
- [ ] 12. Driver: Accept → each step → Tapos
- [ ] 13. Admin: Rides (live map), Dashboard
- [ ] 14–15. Go offline, Ctrl+C in each terminal, close the emulator and WAMP
