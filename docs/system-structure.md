# Papaya HatidGo — System Structure

How the project is organized: why there are three folders, what each one does, how they work together, and how to run them.

For the full system analysis (ERD, workflows, API list, security), see [phase-0-analysis.md](phase-0-analysis.md).

---

## 1. One system, three programs

Papaya HatidGo is **one system** made of **three separate programs**. Each program has its own folder and its own git repository:

```text
Papaya HatidGO\
├── papaya-hatidgo-api\      ← the BACKEND: Laravel 13 + MySQL
├── papaya-hatid-go\         ← the MOBILE APP: Ionic + Angular + Capacitor → Android APK
│                              (also holds all the project documents, in docs\)
└── papaya-hatidgo-admin\    ← the ADMIN WEBSITE: Angular + Tailwind CSS
```

| Folder | What it is | Who uses it | Where it runs |
|---|---|---|---|
| `papaya-hatidgo-api` | The backend: every rule, all the data | No one directly; the app and the website talk to it | A server (in development: your PC, `php artisan serve`) |
| `papaya-hatid-go` | The app for **passengers and drivers** | Passengers and drivers | Installed on Android phones |
| `papaya-hatidgo-admin` | The website for the **administrator** | The admin (staff) | A web browser on a computer |

---

## 2. How they work together

```text
   Passenger / driver phone              Admin's computer (Chrome)
     [papaya-hatid-go]                  [papaya-hatidgo-admin]
            \                                   /
             \     both use the same API       /
              ▼   (HTTPS, JSON, /api/v1/...)  ▼
                  [papaya-hatidgo-api]
                   /        |         \
               MySQL   Firebase (push)  PayMongo (payments)
```

- The **app** and the **website** never talk to each other, and never touch the database. They only send requests to the **API** and show its answers.
- The **API** is the only part that decides things: whether a driver may go online, what a ride costs, who gets a request, and whether a payment really arrived. It is also the only part that reads and writes **MySQL**.
- Every request carries a login token (Laravel Sanctum). The API checks it and the user's role every time: passenger, driver or admin.

### Example: booking a ride

1. **Maria (passenger app)** taps *Mag-book*. The app sends `POST /api/v1/rides` with the pickup and the destination.
2. **The API** checks her account and subscription, and computes the fare itself (the app's number is only compared). It saves the ride in MySQL and offers it to the nearest eligible drivers.
3. The API sends **Juan (driver app)** a push notification through Firebase. His app also checks for requests every 5 seconds.
4. Juan taps *Tanggapin*. The API makes sure only one driver can win the ride, then tells Maria by push. Her screen also checks the ride every few seconds.
5. Meanwhile, **the admin website** shows the ride on its live map, by asking the same API.

---

## 3. Why three folders instead of one

1. **They are different kinds of programs.** PHP on a server, an Android app, and a website. Each has its own language, tools and build command: `composer` for Laravel, `npm` for Angular, Gradle for Android. Each folder holds its own `composer.json` or `package.json` and its own installed libraries.
2. **Different users.** Passengers and drivers use the phone. Only the admin uses the website.
3. **Separate releases.** Fixing a page on the admin website doesn't mean a new APK on every phone, and updating the API doesn't mean reinstalling the app.
4. **Safety.** The admin's screens (approving drivers, changing fares, suspending users) are **not inside the APK** that every passenger downloads. Someone who unpacks the APK finds no admin code.
5. **One source of truth.** All rules and data live only in the API. A fare changed on the admin website applies to the very next booking in the app.

**In architecture terms**, this is a **three-tier client–server architecture**:

| Tier | Part of Papaya HatidGo |
|---|---|
| Presentation (clients) | The mobile app (`papaya-hatid-go`) and the admin website (`papaya-hatidgo-admin`) |
| Application (business logic) | The API (`papaya-hatidgo-api`) |
| Data | MySQL, plus SQLite on the phone for offline start and settings only |

Common ride-hailing services work the same way: a rider app, a driver app, an operations dashboard, and one backend behind them.

---

## 4. What is inside each folder

### `papaya-hatidgo-api` (Laravel 13, PHP, MySQL)

| Path | What it holds |
|---|---|
| `routes/api.php` | Every endpoint (`/api/v1/...`) and who may call it |
| `app/Http/Controllers/Api/V1/` | Receive requests, return JSON (the `Admin/` folder holds the admin's endpoints) |
| `app/Services/` | **The rules**: rides, matching, fares, subscriptions, papers, notifications |
| `app/Models/` | The database tables as PHP classes |
| `database/migrations/` | How the tables are built |
| `routes/console.php` | Scheduled jobs: expire requests and papers, reminders |
| `lang/en`, `lang/fil` | Messages in English and Taglish |
| `tests/` | Automated tests (PHPUnit) |

### `papaya-hatid-go` (Ionic 9, Angular 22, Capacitor 8)

| Path | What it holds |
|---|---|
| `src/app/features/passenger/` | Passenger screens: Book, the ride, Rides, Account |
| `src/app/features/driver/` | Driver screens: Home, requests, the ride, Earnings, papers |
| `src/app/features/notifications/` | The Alerts screen (both roles) |
| `src/app/core/services/` | Talking to the API, GPS, maps, push, login |
| `src/app/core/i18n/` | Every text in English and Taglish |
| `android/` | The Android project that becomes the APK |
| `docs/` | **All project documents** (this file, the phase plans and reports) |
| `DESIGN.md` | The design system (colors, type, buttons, rules) |

### `papaya-hatidgo-admin` (Angular 22, Tailwind CSS 4)

| Path | What it holds |
|---|---|
| `src/app/pages/` | Dashboard, Verification, Rides & live map, Users, Fares & settings, Plans & payments, Requirements, Reports, Audit log |
| `src/app/core/` | Talking to the API, admin-only login |
| `src/app/shared/` | Shared pieces: status chip, dialogs, charts, date and money formats |

---

## 5. How to run them

### For a demo

| Terminal | Folder | Command | Purpose |
|---|---|---|---|
| 1 | `papaya-hatidgo-api` | `php artisan serve` | The API (always needed) |
| 2 | `papaya-hatidgo-admin` | `npm start` → http://localhost:4300 | The admin website |
| 3 | `papaya-hatidgo-api` | `php artisan schedule:work` | Scheduled jobs: expiry, reminders |

The phones use the **installed app**; `npm start` in `papaya-hatid-go` is not needed. Connect the phone (USB) and the emulator to the API with `npm run adb:reverse`, run inside `papaya-hatid-go`.

### During development

| Working on | Run |
|---|---|
| Mobile app screens | API + `npm start` in `papaya-hatid-go` → http://localhost:4200 (updates on save) |
| Camera, GPS, push (phone-only features) | API + build and install on the device (see below) |
| Admin website | API + `npm start` in `papaya-hatidgo-admin` → http://localhost:4300 |
| API rules | `php artisan serve`; check with `php artisan test` |

Build and install the app (inside `papaya-hatid-go`):

```text
npm run android:dev
cd android
.\gradlew assembleDebug
adb -d install -r app\build\outputs\apk\debug\app-debug.apk    ← the phone (USB)
adb -e install -r app\build\outputs\apk\debug\app-debug.apk    ← the emulator
cd ..
npm run adb:reverse
```

Step by step: [building-apk-and-installing.md](building-apk-and-installing.md).

### Demo accounts (development data only)

| Role | Login | Password |
|---|---|---|
| Admin | `admin@example.test` | `password` |
| Passenger | `pasahero1@example.test` | `password` |
| Driver | `driver1@example.test` | `password` |

---

## 6. Secrets: kept out of all three repositories

| Secret | Where it lives | In git? |
|---|---|---|
| Database password, app key | `papaya-hatidgo-api/.env` | ❌ never |
| Firebase server key (push) | A file outside the repositories; `.env` holds only its path | ❌ never |
| Firebase app file | `papaya-hatid-go/android/app/google-services.json` | ❌ git-ignored |
| MapTiler map key | `src/environments/map-key.ts` in the app and the admin website | ❌ git-ignored |
| PayMongo keys | `papaya-hatidgo-api/.env` | ❌ never |

Each folder's `.gitignore` keeps these files out. After cloning on a new PC, they have to be added again by hand.

---

## 7. Where to read more

| Topic | Document |
|---|---|
| Requirements, ERD, workflows, API, security | [phase-0-analysis.md](phase-0-analysis.md) |
| What each phase built, and why | [README.md](README.md) (the index of phase reports) |
| The admin website | [phase-14-admin-web.md](phase-14-admin-web.md) |
| Notifications (push) | [phase-13-notifications.md](phase-13-notifications.md) |
| The design rules | [../DESIGN.md](../DESIGN.md) |
| PC setup (Java, Android SDK, adb) | [environment-setup.md](environment-setup.md) |
