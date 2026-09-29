# Phase 5 — Authentication (API + Mobile) and the First Real Design

> **Status:** 📋 Planned. Written before implementation (development protocol).
> **Goal:** Real accounts end to end. A passenger or driver registers and logs in from the phone, the token is kept securely, every request is authenticated, and the app gets its **visual system** (DESIGN.md) through its first real screens.
> **Done when:** on the Redmi, a new user can register → land on their role's home → close and reopen the app still logged in → log out; forgot-password works with a 6-digit code; all API feature tests pass.

---

## 1. Decisions (confirmed)

| Topic | Decision |
|---|---|
| Login identifier | **Email or phone** + password (decision 12) |
| Registration | Passengers and drivers register themselves; **admins cannot** (created by seeders/admins) |
| Token | Laravel Sanctum personal access token, **expires after 30 days**; logout revokes it immediately |
| Forgot password | **6-digit code** emailed, valid **15 minutes**, entered in the app (no web page, no deep links) |
| Email in development | `MAIL_MAILER=log`: emails are written to `storage/logs/laravel.log` |
| Token storage on the phone | `@aparajita/capacitor-secure-storage` 8.0.1 (Android Keystore, encrypted). Never SQLite, never plain Preferences (phase-0 § H) |

## 2. Findings that shape the implementation

| Finding | Consequence |
|---|---|
| Sanctum default `expiration = null` (never expires) | Set `expiration = 43200` minutes (30 days) |
| `phpunit.xml` uses SQLite in memory; our migrations use MySQL-only features (CHECKs, generated columns) | Tests run on a separate MySQL database `papaya_hatidgo_test` |
| The Android WebView runs at `https://localhost`; the dev API is `http://…:8000` | Android blocks plain HTTP (API 28+) and mixed content → enable **CapacitorHttp** (requests go through the native layer) and allow cleartext **only for localhost/10.0.2.2 in development** (network security config) |
| The phone can't reach the PC's `127.0.0.1` | `adb reverse tcp:8000 tcp:8000`: the phone's `localhost:8000` is forwarded to the PC over USB (works for the emulator too) |

## 3. API contracts (`/api/v1`)

Common error format for every endpoint:
```json
{ "message": "Human-readable (Taglish) message", "code": "MACHINE_CODE", "errors": { "field": ["..."] } }
```
`code` and `errors` appear only when relevant. Status codes: 401 not logged in · 403 not allowed · 422 validation · 429 too many attempts.

### 3.1 `POST /auth/register`
| | |
|---|---|
| Purpose | Create a passenger or driver account and log it in |
| Auth / role | Public · throttled (5 per minute per IP) |
| Request | `first_name`, `last_name`, `email`, `phone`, `password`, `password_confirmation`, `role` (`passenger` \| `driver`), `device_name` |
| Validation | names required ≤ 80 · email valid, unique · phone = PH mobile (09XXXXXXXXX / +639XXXXXXXXX / 639XXXXXXXXX), **normalized to +639XXXXXXXXX** before the unique check · password ≥ 8 chars, letters + numbers, confirmed · role in (passenger, driver) only |
| Response | `201 { "token": "…", "user": UserResource }` |
| Side effects | In **one DB transaction**: `users` row + `passengers` or `drivers` row (a driver starts at `pending_verification`) |
| Errors | 422 (e.g. email already used) · 429 |
| Security | `role` can never be `admin` · password hashed (bcrypt) · `role`/`account_status` are not mass-assignable (set explicitly by the service) |

### 3.2 `POST /auth/login`
| | |
|---|---|
| Purpose | Exchange credentials for a token |
| Auth / role | Public · throttled (**5 attempts per minute per login + IP**) |
| Request | `login` (email **or** phone), `password`, `device_name` |
| Response | `200 { "token": "…", "user": UserResource }` |
| Errors | 422 `INVALID_CREDENTIALS`: one generic message for a wrong email/phone **or** a wrong password (never reveal which one exists) · 403 `ACCOUNT_SUSPENDED` · 429 |
| Security | Constant generic error prevents account enumeration · every login creates a new token (per device) with a 30-day expiry |

### 3.3 `POST /auth/logout`
| | |
|---|---|
| Auth | `auth:sanctum` |
| Effect | Revokes **only the current token** (other devices stay logged in) |
| Response | `204 No Content` |

### 3.4 `GET /auth/me`
| | |
|---|---|
| Purpose | "Who am I?": used on app start to restore the session |
| Auth | `auth:sanctum` |
| Response | `200 { "user": UserResource, "passenger"?: {...}, "driver"?: { "compliance_status", "active_vehicle_id" }, "subscription": { "status": "active" \| "expired" \| … \| null, "ends_at" } }` |
| Errors | 401 (expired or revoked token) |

### 3.5 `POST /auth/forgot-password`
| | |
|---|---|
| Purpose | Send a 6-digit reset code |
| Auth | Public · throttled (3 per 10 minutes per email + IP) |
| Request | `email` |
| Response | **Always** `200 { "message": "Kung may account ang email na ito, nagpadala kami ng code." }`, whether or not the email exists |
| Side effects | Random 6-digit code; only its **hash** is stored in `password_reset_tokens` (with `created_at`); a new request replaces the old code; email sent (log mailer in dev) |
| Security | No account enumeration · code never stored in plain text · valid 15 minutes |

### 3.6 `POST /auth/reset-password`
| | |
|---|---|
| Request | `email`, `code`, `password`, `password_confirmation` |
| Response | `200 { "message": "Napalitan na ang password mo. Mag-login ulit." }` |
| Errors | 422 `INVALID_OR_EXPIRED_CODE` (same message for wrong, expired, or no code) · 429 (5 attempts per 15 minutes per email) |
| Side effects | Password updated · code deleted · **all tokens of that user revoked** (anyone logged in with the old password is logged out) |

### 3.7 `UserResource` (what the API reveals about a user)
`id, first_name, last_name, full_name, email, phone, role, account_status`. Never `password`, `remember_token`, or timestamps the app doesn't need.

## 4. Backend structure

| Piece | Responsibility |
|---|---|
| `Http/Requests/Auth/*Request.php` | Validation + phone normalization (`prepareForValidation`) |
| `Services/AuthService.php` | Register (transaction), login checks, token issuing |
| `Services/PasswordResetService.php` | Create, verify, and consume reset codes |
| `Http/Controllers/Api/V1/AuthController.php` | Thin: request → service → resource |
| `Http/Resources/UserResource.php` | The only shape in which users leave the API |
| `Mail/PasswordResetCodeMail.php` | The Taglish reset email |
| `bootstrap/app.php` | API error format (JSON for `api/*`) |
| `AppServiceProvider` | Named rate limiters (`login`, `register`, `password-reset`) |
| `tests/Feature/Auth/*Test.php` | Feature tests on `papaya_hatidgo_test` |

## 5. Mobile structure

| Piece | Responsibility |
|---|---|
| `core/services/token-storage.service.ts` | Save / read / delete the token in secure storage (the only place that touches the plugin) |
| `core/services/auth.service.ts` | **Replaces fakeLogin**: `register`, `login`, `logout`, `restoreSession` (GET /me on start), user signal |
| `core/interceptors/auth-interceptor.ts` | Adds `Authorization: Bearer …`; on 401 → clear session → `/auth/login` |
| `app initializer` (main.ts) | Restores the session **before** the first route is decided, so guards see the real login state |
| `capacitor.config.ts` | `CapacitorHttp` enabled |
| `android/.../network_security_config.xml` | Cleartext allowed only for `127.0.0.1`, `localhost` and `10.0.2.2` |
| Auth pages | Welcome, Login, Register (passenger/driver), Forgot password (code + new password) |

## 6. Design (impeccable) — first real screens

The welcome, login, register, and forgot-password screens are the **first real UI**, so this step also establishes the **app-wide visual system** (DESIGN.md) that every later screen follows (see IMPECCABLE-GUIDE.md). The screens must honor:
- PRODUCT.md (Taglish, outdoor sunlight, one-handed use, low-end Android, Material 3 structure);
- the glossary in `design-briefs/passenger-booking.md` § 8;
- the booking, active ride, driver requirements, and driver home briefs, which the visual system must also serve.

## 7. Implementation steps

| Step | Part | Task |
|---|---|---|
| 5.1 | API | JSON error format · token expiry · rate limiters · test database |
| 5.2 | API | Register · login · logout · me (+ Form Requests, AuthService, UserResource) |
| 5.3 | API | Forgot / reset password with a 6-digit code |
| 5.4 | API | Feature tests (T1–T12 below) |
| 5.5 | Mobile | Secure storage · CapacitorHttp · cleartext (dev only) · `adb reverse` · API reachable from the phone |
| 5.6 | Mobile | Real AuthService · session restore · interceptor (Bearer + 401) · remove fakeLogin |
| 5.7 | 🎨 Design | `/impeccable` visual direction → DESIGN.md → welcome, login, register, forgot-password screens |
| 5.8 | Mobile | Connect the screens to AuthService; show API validation errors on the fields |
| 5.9 | All | Device tests + report + commits |

## 8. Test plan

**API feature tests (5.4):**

| # | Test | Expected |
|---|---|---|
| T1 | Register passenger | 201, token, `passengers` row created |
| T2 | Register driver | 201, `drivers` row with `pending_verification` |
| T3 | Register with `role = admin` | 422 |
| T4 | Register with an email or phone already used (phone in another format, e.g. 0917… vs +63917…) | 422 (normalization works) |
| T5 | Login with email · login with phone | 200 both |
| T6 | Wrong password vs unknown email | Same 422 `INVALID_CREDENTIALS` message |
| T7 | Suspended account | 403 `ACCOUNT_SUSPENDED` |
| T8 | 6th login attempt within a minute | 429 |
| T9 | `/me` with token · without · after logout | 200 · 401 · 401 |
| T10 | Forgot password for an unknown email | Same 200 message as for a real one |
| T11 | Reset with the right code · wrong code · expired code (16 min) | 200 · 422 · 422 |
| T12 | After reset: old tokens revoked, new password works | 401 on old token · login 200 |

**Device tests (5.9):** register on the Redmi → home of the right role · kill and reopen the app → still logged in · logout → login page · wrong password → field message · airplane mode during login → "Walang internet" · expired/revoked token → back to login.

---

## 9. Report (Phase 5 complete, 2026-09-29)

| Step | Result |
|---|---|
| 5.1 | ✅ `ApiErrorRenderer` (one JSON error shape, no stack traces) · tokens expire in 30 days + daily prune · 4 named rate limiters · MySQL test DB `papaya_hatidgo_test` |
| 5.2 | ✅ register / login / logout / me · `PhoneNumber` normalization · constant-time login failure (precomputed dummy hash) · `SubscriptionService` (computed status) |
| 5.3 | ✅ forgot / reset with a 6-digit code: `random_int`, only the hash stored, 15-minute expiry, single use, revokes all tokens · email in the dev log |
| 5.4 | ✅ **40 tests, 129 assertions, all passing** (T1–T12 + phone normalization + error format + extras: device-only logout, 31-day token expiry, computed subscription status over time, no half-created accounts) |
| 5.5 | ✅ Secure storage plugin (Keystore) · CapacitorHttp · network security config (cleartext only 127.0.0.1 / localhost / 10.0.2.2) · `allowBackup=false` · `TokenStorageService` · `ApiHealthService` + "Check API" in diagnostics · `npm run adb:reverse` (all devices). **Redmi → API: HTTP 200, 485 ms.** |
| 5.6 | ✅ Real AuthService (fakeLogin removed) · session restore via provideAppInitializer · interceptor (Bearer only for our API; 401 → login) · ApiError mapping · functional login form. **Redmi:** wrong password msg ✅ · Maria → passenger ✅ · kill + reopen → still logged in ✅ · logout ✅ · Juan → driver ✅ · Ana (admin) blocked ✅ · phone login 0917… ✅ · unplugged USB → "Walang internet o hindi maabot ang server" ✅ |
| 5.7 | ✅ **Design.** A first direction ("TODA terminal sign": green enamel board, Bungee sign lettering) was built and reviewed, then **replaced by the student's own mockup** (see § 10). Final build: white screens, deep papaya orange buttons, leaf green, authored tricycle + papaya-leaf logo (SVG), a **Get Started** page before login, restyled login / register / forgot password. Finish review verdict "fix" (3 items), all applied and re-checked. **DESIGN.md** + `.impeccable/design.json` written from the shipped code. |
| 5.8 | ✅ Taglish validation messages in the API (`lang/fil/validation.php`, locale `fil`) + test `test_validation_messages_are_in_taglish`: **41 tests, 133 assertions, all passing.** **Redmi:** Get Started → register as Driver ✅ · login with mobile number ✅ · duplicate email → "May account na gamit ang email na ito." ✅ · wrong password message ✅ · forgot → code from the log → new password works ✅ |
| 5.9 | ✅ This report · README progress · commits |

### Problems found (and how they were fixed)

| # | Problem | Layer | Cause | Fix |
|---|---|---|---|---|
| 1 | **Registration returned 500** (found by RegisterTest T1/T2, not by the manual curl test) | Laravel / Eloquent | After `save()`, values MySQL fills in by itself (the `account_status` default `'active'`) are not on the in-memory model → `null->value` in `UserResource` | `return $user->refresh();` in `AuthService::register()` |
| 2 | First timing-protection draft used `Hash::make()` for unknown accounts | Security | `make` + `check` = two bcrypt operations vs one for real accounts, which is a measurable difference | A precomputed dummy hash: always exactly one bcrypt check |
| 3 | Password rule messages (and generic "The … field is required") came back in English | Localization | They come from Laravel's built-in translation file (`en`) | 5.8: `lang/fil/validation.php` with Taglish text and field names (`first_name` → "pangalan"); `APP_LOCALE=fil`; locked by a test |
| 4 | Phone: "Hindi maabot ang server" while the laptop worked | adb / USB | Phone + emulator both connected: the port forward had been applied only to the emulator; on the phone 127.0.0.1 is the phone itself (connection refused) | `adb -s <serial> reverse tcp:8000 tcp:8000`; `scripts/adb-reverse.mjs` now forwards every connected device |
| 5 | Airplane mode did not block login | Test design | The dev API is reached over USB (adb reverse); airplane mode only turns off radios, not USB | Test "no connection" by stopping php artisan serve or unplugging USB |
| 6 | `npx cap run android`: `'gradlew' is not recognized` | Tooling (Windows) | The project folder path has a space ("Papaya HatidGO") | Build with `.\gradlew.bat assembleDebug` in `android/`, then `adb install -r …app-debug.apk` |
| 7 | Emulator screenshots saved from PowerShell would not open | Tooling (Windows) | PowerShell `>` re-encodes binary output as text | Save them from Git Bash: `adb exec-out screencap -p > file.png` |
| 8 | Sass warning: `@import` is deprecated | Build | Dart Sass 3 removes `@import` for Sass files | `@use` for our own Sass files (Ionic's plain CSS imports stay) |
| 9 | The mockup's bright orange (#F57C00) with white text is hard to read | Accessibility | Contrast only **2.7 : 1** (WCAG needs 4.5 : 1 for normal text) | Buttons use deep papaya **#C2410C** (5.2 : 1); the bright orange stays only inside the logo |
| 10 | Driver tricycle icon was invisible | Ionicons | The SVG data URL was percent-encoded; Ionicons reads the raw text after `;utf8,` to find `<svg>` | Embed the SVG unencoded (like Ionicons' own icons); viewBox cropped so it matches the person icon's size |
| 11 | Wordmark showed "PapayaHatidGo" (no space) | Angular | The compiler removes whitespace-only text between two elements | Angular's `&ngsp;` entity keeps the space |
| 12 | Review: app turned dark on phones in dark theme / battery saver | Design | The theme followed the phone's dark setting; battery saver switches Android to dark | App is always white (the pinned look, read in the sun); status bar always dark icons. A night mode can come later as an explicit setting |
| 13 | Review: login field showed a phone example but opened the email keyboard | UX | `inputmode="email"` on a field that accepts email **or** phone | Normal keyboard; placeholder "hal. 0917 123 4567 o email" |
| 14 | Redmi: diagnostics said the API cannot be reached (again) | adb / USB | The `adb reverse` tunnel is lost on USB replug, phone restart, or adb restart | Run `npm run adb:reverse` again and check for a ✔ line for the phone; if the browser on the laptop can't open `/api/v1/health`, start `php artisan serve` |

**Lesson:** the manual test avoided a successful registration (to keep dev data clean), so it never reached the crashing line. Automated tests on a separate database can safely do the "real" thing every time.

**Troubleshooting checklist (phone cannot reach the API):**

1. Laptop: `http://127.0.0.1:8000/api/v1/health` in the browser → must show `"status":"ok"`. If not, run `php artisan serve` in `papaya-hatidgo-api`.
2. `npm run adb:reverse` in `papaya-hatid-go` → must show `✔ a014e6ac`.
3. Diagnostics (dev) → Check API.

## 10. Design decision: from "TODA sign" to the student's mockup

| | First direction (v1, replaced) | Final direction (v2, shipped) |
|---|---|---|
| Source | Impeccable concept roll (seed 4ee2868e), "TODA terminal sign" | The student's own mockup (pinned as canon, not re-rolled) |
| Look | Green enamel board, cream sign lettering (Bungee), painted plates | Clean white screens, deep papaya orange buttons, leaf green brand |
| Logo | Papaya-half mark | Tricycle with a papaya leaf (recreated as SVG from an AI mockup) |
| Entry | Welcome with "PASAHERO / DRIVER" rows | **Get Started** page: "Magsimula" (register, role chosen there) or "May account na ako" (login) |
| Kept from v1 | — | Older-user rules: 18px base text, 60px buttons, labels that stay visible, states shown by mark + color, Taglish, contrast checked |

**Why:** the student preferred a familiar ride-app look with a clear start page. The older-user rules were kept, so the mockup look is done accessibly. **DESIGN.md** is the record every later screen (booking map, active ride, driver home) follows.

**Files (mobile):** `src/theme/variables.scss` (tokens) · `src/theme/world.scss` (buttons, fields, notices, page head, toolbar) · `src/global.scss` (fonts: Atkinson Hyperlegible Next 400/700/800) · `shared/components/brand-logo/` · `shared/icons/tricycle.icon.ts` · `features/auth/pages/*` · `DESIGN.md` · `.impeccable/design.json` · `.impeccable/surfaces/src-app-features-auth.md` (direction contract v2).
**Files (API):** `lang/fil/validation.php` · `config/app.php` (locale `fil`) · `tests/Feature/Auth/RegisterTest.php`.
