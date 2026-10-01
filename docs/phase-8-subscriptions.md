# Phase 8 — Subscriptions + PayMongo (test mode)

**Goal:**
- A passenger or driver picks a plan and pays on PayMongo's page (test mode).
- The server, never the app, confirms the payment and activates the subscription.
- Drivers can't go online without an active subscription, and passengers can't book without one.

**Done when (phase-0 § M):** pay in test mode → active; gates enforced.

**Rules come from:**
- [phase-0-analysis.md § F](phase-0-analysis.md#f-subscriptions-and-payment-protocol): rules, statuses, renewal timing, the payment protocol and its 6 guarantees.
- § G: the API.
- § C: the tables.
- [DESIGN.md](../DESIGN.md): the visual rules.

## 1. What already exists (Phase 4 / 5 / 7)

| Piece | Where | Notes |
|---|---|---|
| `subscription_plans` + seeder | 6 sample plans: passenger ₱49 / month, driver ₱199 / month; 6 months = 5 paid, 12 months = 10 paid | Admin-editable later (Phase 14) |
| `subscriptions` | `state` = pending · paid · cancelled · suspended (facts only) | **active / past_due / expired are computed** from the dates + `subscription.grace_days` (Phase 4 decision N18), so they can never go stale |
| `subscription_transactions` | One row per checkout attempt. `provider_checkout_id` UNIQUE. **At most one paid transaction per subscription** (the `paid_key` UNIQUE column) | The database itself blocks paying one period twice |
| `payment_events` | Webhook log, UNIQUE (`provider`, `provider_event_id`) | This is what makes the webhook **idempotent** |
| `SubscriptionService` | `current()`, `status()`, `isActive()` (read side, Phase 5) | Phase 8 adds checkout, activation, reconciliation |
| `DriverComplianceService::eligibility()` | Already has the `subscription_active` check (Phase 7) | Phase 8 exposes it and enforces it |
| `/auth/me` | Already returns `subscription: {status, plan_id, ends_at}` | The app's gates read it |
| Dev data | `pasahero1`, `driver1`: active · `pasahero2`, `driver2` (Pedro, verified in Phase 7): **no subscription** | Pedro and pasahero2 are the Phase 8 test accounts |

## 2. How it works

```text
 APP                         LARAVEL                                  PAYMONGO (test)
 Pay ₱199 ─ POST /subscriptions {plan_id} ─►  plan for my role? active?
                              pending subscription + pending transaction
                              PaymentGateway.createCheckout() ───────►  checkout session
 ◄──── checkout_url ───────── save provider_checkout_id  ◄── cs_…, checkout_url
 Custom Tab opens PayMongo's page ─────────────────────────────────►  pays (test GCash / Maya / card)
                              ◄──── webhook checkout_session.payment.paid (signed)
                              verify signature → log event (unique) → amount == expected?
                              → activate(): transaction paid, subscription paid + dates
 PayMongo → /payments/return → "Back to the app" (deep link) → Custom Tab closes
 GET /subscriptions/{id} ───► still pending? ask PayMongo directly (reconcile) ──►
 ◄──── status: active ─────── 
```

**The 6 guarantees of phase-0 § F.2, and where each one lives:**

| # | Guarantee | Implementation |
|---|---|---|
| 1 | The app never reports payment success | Only `SubscriptionService::activate()` marks anything paid, and only the webhook or reconciliation call it. The return to the app only triggers a status check |
| 2 | The webhook is idempotent | `payment_events` UNIQUE event id. `activate()` also does nothing for a transaction that's already paid, and the `paid_key` UNIQUE column is the last line of defense |
| 3 | The amount is verified on the server | The gateway's paid amount (centavos) must equal the transaction amount. Otherwise: not activated, transaction `failed`, logged |
| 4 | Secret keys only in Laravel's `.env` | `PAYMONGO_SECRET_KEY`, `PAYMONGO_WEBHOOK_SECRET`. The app holds no key |
| 5 | Reconciliation | `GET /subscriptions/{id}` and `/subscriptions/current` ask PayMongo when a checkout is still pending |
| 6 | Demo fallback | `POST /admin/subscriptions/{id}/activate` with a reason, audit-logged |

## 3. Implementation steps

### Part A — API (`papaya-hatidgo-api`)

| Step | Task |
|---|---|
| 8.1 | Payment gateway layer: `PaymentGateway` interface · `PayMongoGateway` (Checkout Sessions API) · `FakeGateway` (local test page, never in production) · config · unit tests with `Http::fake` |
| 8.2 | Subscriptions API: `GET /subscription-plans` · `POST /subscriptions` (checkout) · `GET /subscriptions/current` · `GET /subscriptions/{id}` · `GET /subscriptions` · `POST /subscriptions/{id}/cancel` · `GET /subscription-transactions` · activation + renewal dates + reconciliation · the return page |
| 8.3 | Webhook `POST /webhooks/paymongo`: signature, idempotency, amount check, activation · `php artisan paymongo:webhook {url}` (registers the webhook in PayMongo) |
| 8.4 | Gates + admin: `subscribed` middleware (booking gate, used by `POST /rides` in Phase 9) · `GET /drivers/me/eligibility` · `PATCH /drivers/me/availability` (go online refused without eligibility) · admin manual activation · Postman |

### Part B — Mobile (`papaya-hatid-go`)

| Step | Task |
|---|---|
| 8.5 | `@capacitor/browser` · the deep link back to the app · `SubscriptionService` (checkout → browser → return → check) |
| 8.6 | Screens: **Subscription** (status, plans, pay, waiting/checking, history) for both roles · Driver Home ③ real · Passenger Book gate · Account rows |
| 8.7 | Finish review · emulator end to end · report · commit |

**Not in Phase 8:**
- Reminder notifications before a subscription ends (Phase 13; the app shows a banner on its own).
- Admin plan editing and the subscription list screens (Phase 14).
- Going online for real, with location and the map (Phase 11). Phase 8 only adds the **gate** on the endpoint.

## 4. Decisions

The student asked for Phase 8 straight to the end without questions, so these are recommendations taken as decided. Each one is easy to change.

| # | Decision | Why |
|---|---|---|
| 1 | **A fake test gateway for local development** (`PAYMENT_GATEWAY=fake`, the default). Real PayMongo when `PAYMENT_GATEWAY=paymongo` + test keys are in `.env` | The flow can be built and tested before a PayMongo account exists. The fake goes through the **same** activation and reconciliation code; only the page that takes the "payment" differs. It refuses to run in production |
| 2 | Checkout opens in a **Custom Tab** (`@capacitor/browser`), never inside the app's WebView | The card / GCash page belongs to PayMongo. The app never sees payment details, and the driver sees the real PayMongo address bar |
| 3 | Back to the app: PayMongo → `/payments/return` (a small Laravel page) → a "Back to the app" deep link `com.papayahatidgo.app://payment` | PayMongo needs a web address for `success_url`. The deep link closes the Custom Tab. If the driver closes it by hand, the app checks anyway |
| 4 | Renewal = buy a plan again (`POST /subscriptions`). It starts at the current `ends_at` when still active, so no paid days are lost (§ F.1). **At most one renewal waiting** (409 `ALREADY_RENEWED`) | Stops an accidental double payment. The separate `/renew` endpoint in § G isn't needed |
| 5 | A new checkout **replaces** an unpaid one (after asking PayMongo whether it was paid after all). **A payment always wins**: if money arrives for a checkout the user cancelled, the subscription is still activated | Nobody pays and gets nothing |
| 6 | Grace period stays **0 days** (open decision #13; `subscription.grace_days` setting) | Unchanged until the panel decides |
| 7 | Payment methods: GCash, Maya, card (`PAYMONGO_METHODS`) | The three the town uses. Test mode simulates all three |
| 8 | Prices: the seeded sample prices | Placeholders until the client sets real ones (Phase 14 admin) |

## 5. Test plan (summary)

| # | Test | Expected |
|---|---|---|
| S1 | A driver opens plans | Only the 3 driver plans, in order |
| S2 | A passenger posts a driver plan | 422, plan not for this account |
| S3 | Subscribe → checkout | Pending subscription + pending transaction, checkout URL, correct centavos |
| S4 | Pay (test) → back to the app | Status active, `ends_at` = now + 1 month; Home ③ "Active" |
| S5 | The webhook arrives twice | Activated once; one event row |
| S6 | Wrong webhook signature | 401, nothing changes |
| S7 | Paid amount differs | Not activated; transaction failed (amount mismatch) |
| S8 | Webhook late (none at all) | Reconciliation on `GET /subscriptions/{id}` activates |
| S9 | Renew while active | The new period starts at the current `ends_at` |
| S10 | Renew again while a renewal is waiting | 409 `ALREADY_RENEWED` |
| S11 | Cancel on PayMongo's page | Subscription cancelled; Pay again works |
| S12 | Driver goes online without a subscription | 403 `NOT_ELIGIBLE`, with the checklist showing `subscription_active: false` |
| S13 | A passenger without a subscription hits a booking route | 403 `SUBSCRIPTION_INACTIVE` |
| S14 | Admin manual activation | Active; audit log row with the reason |

---

## 6. Implementation log (becomes the report in 8.7)

| Step | Result |
|---|---|
| 8.1 | ✅ `app/Payments/`: `PaymentGateway` interface · `PayMongoGateway` (Checkout Sessions, Basic auth with the secret key, centavos, errors → 502 `PAYMENT_GATEWAY_ERROR`) · `FakeGateway` (local test page, refused in production) · `config/payments.php` + `services.paymongo` · **6 tests** |
| 8.2 | ✅ `SubscriptionService`: `startCheckout`, `reconcile`, `cancel`, `activate` (the only place money becomes a subscription), `summary`, renewal dates · 7 endpoints · the return page + fake checkout page (`routes/web.php`) · plan names in both languages · `throttle:checkout` · **14 tests** |
| 8.3 | ✅ `POST /webhooks/paymongo`: signature (`PayMongoSignature`, HMAC-SHA256, constant-time compare) → `payment_events` (idempotent) → `activate()` · `php artisan paymongo:webhook {url}` · **10 tests** |
| 8.4 | ✅ `subscribed` middleware (403 `SUBSCRIPTION_INACTIVE`) · `GET /drivers/me/eligibility` · `PATCH /drivers/me/availability` (403 `NOT_ELIGIBLE` + checklist) · admin `GET /admin/subscriptions`, `POST …/{id}/activate` (reason, audit) · Postman folder + signed-webhook request · **10 tests** · **API 148 / 148 tests, 686 assertions. Part A complete** |
| 8.5 | ✅ `@capacitor/browser` (Custom Tab) · deep link `com.papayahatidgo.app://payment` (AndroidManifest) · `SubscriptionService` (`openCheckout` waits for the deep link or a closed tab; `confirm` asks the server up to 4 times) · `subscription-view.ts` · logout clears the cached status · **10 new unit tests** |
| 8.6 | ✅ **Subscription** page (both roles) · Driver Home ③ real + "ready" state · Passenger Book **gate** · Account rows · ~55 messages in both languages · **full flow on the emulator**: pay, cancel, closed tab + late payment, gates (S1, S3, S4, S8, S11–S13) |
| 8.7 | ✅ Finish review: 8 fixes, all applied and rechecked on the emulator (no second Pay while a payment may still arrive · test mode from the server · offline notice · lead text when subscribed · no booking instructions behind the gate · "Book a ride" for passengers · every plan card shows a mark · "Pay month by month") · DESIGN.md: info notice, tags, plan cards · a time-of-day bug in 3 Phase 7 tests fixed · **API 149 / 149 · mobile 65 / 65** |

### Problems found

| # | Problem | Cause | Fix |
|---|---|---|---|
| 1 | The webhook controller's `firstOrCreate` would be refused | `PaymentEvent` allows no mass assignment (on purpose), and strict mode turns that into an error | Look the event up first, then `forceCreate` (the controller sets every column itself) |
| 2 | A new test's `/auth/me` answered 500 (`MissingAttributeException: account_status`) | The factory-made user object didn't contain the database's default `account_status`; strict mode refuses to read a missing attribute | Test helper: `$user->refresh()` after creating. Not an app bug: real users are always loaded from the database |
| 3 | A date assertion failed by a fraction of a second | MySQL stores whole seconds; the frozen test clock had microseconds | `freezeSecond()` instead of `freezeTime()` |
| 4 | VS Code shows "Undefined type …" in the API files | The open workspace is the mobile repo, so the PHP extension doesn't index the API's `vendor/` | None needed: `php -l` and the 148 tests are the real check. Open `papaya-hatidgo-api` as its own VS Code window to get PHP hints |

---

## 7. Step notes (explained)

### 8.1 The payment gateway layer

**Why an interface?** `SubscriptionService` must not care **who** takes the money. It talks to `PaymentGateway`, which has three methods:

| Method | Meaning |
|---|---|
| `createCheckout(CheckoutRequest)` | "Make a payment page for ₱199.00" → `CheckoutSession` (id + URL) |
| `fetchCheckout(id)` | "What happened to that page?" → `CheckoutStatus` (paid? amount? method?) |
| `expireCheckout(id)` | "Close that page, it won't be used" (best effort) |

Two classes implement it. `AppServiceProvider` picks one from `PAYMENT_GATEWAY`:

| Class | When | How it works |
|---|---|---|
| `PayMongoGateway` | `PAYMENT_GATEWAY=paymongo` | `POST https://api.paymongo.com/v1/checkout_sessions` with the **secret key as the Basic-auth username**. Amounts in **centavos** (₱199.00 → `19900`). Offers GCash, Maya, card. A refusal or an outage → `502 PAYMENT_GATEWAY_ERROR`, with PayMongo's details only in the log |
| `FakeGateway` | `PAYMENT_GATEWAY=fake` (the default) | The "payment page" is our own test page (`/payments/fake-checkout/{id}`), and the checkout lives in the cache. **Everything after the page is the real code.** It throws in production |

**Why amounts in centavos:** money as a decimal number (`199.00`) can pick up float errors in arithmetic (`0.1 + 0.2 ≠ 0.3`). PayMongo works in whole centavos. We convert once, rounded: `SubscriptionService::centavos()`.

**Tests** (`PaymentGatewayTest`, 6): what we send PayMongo (URL, Basic auth, centavos, methods, return URLs, metadata) · reading a paid / unpaid / expired checkout · a refusal becomes a 502 without PayMongo's details · the fake is paid only after its page says so · the right class is bound, and the fake is refused in production.

### 8.2 Subscriptions API

| Endpoint | What it does |
|---|---|
| `GET /subscription-plans` | My role's active plans, in order. Names in my language (`lang/{en,fil}/plans.php`) |
| `POST /subscriptions {plan_id}` | Checks the plan (active? for my role?) → closes an older unpaid checkout (after asking the gateway) → refuses if a renewal is already waiting → creates a **pending** subscription (price copied) → asks the gateway for a page → saves the **pending** transaction → `201 {subscription, checkout_url}` |
| `GET /subscriptions/{id}` | What the app polls after the payment page closes. **Still pending? Ask the gateway first** (reconciliation) |
| `GET /subscriptions/current` | `status` (none / active / past_due / expired) · `current` · `renewal` (paid, starts later) · `pending` (unpaid checkout) · `active_until` · `remaining_days` |
| `POST /subscriptions/{id}/cancel` | Closes an unpaid checkout (and tells the gateway). If it was paid after all, the payment wins |
| `GET /subscriptions` · `GET /subscription-transactions` | My history and my payment attempts (no provider ids) |

**`activate()`: the heart of Phase 8.** It's the only code that turns money into a subscription:

1. It locks the transaction row and the subscription row (`lockForUpdate`), so two deliveries at the same instant wait for each other.
2. If the transaction is already paid, it stops. That makes it **idempotent**.
3. It checks the paid amount against the expected centavos. On a mismatch it marks the transaction failed, writes the audit log, and **doesn't** activate.
4. It works out the dates. `starts_at` is the end of the time already paid for, or now if nothing is running. `ends_at` is `starts_at` plus the plan's months (`addMonthsNoOverflow`: Jan 31 + 1 month = Feb 28, not Mar 3).
5. It marks the transaction paid, with the method, the provider's payment id and `paid_at`.
6. It writes an audit log row with `via` = webhook / reconciliation / manual.

**Why the gateway call is outside the database transaction:** a slow network must not hold database locks. If PayMongo fails, the half-made subscription is deleted again (test: "when the gateway is down nothing is left behind").

**The return page** (`/payments/return`) is where PayMongo sends the user. It says "Thank you! Go back to the app." with a button `com.papayahatidgo.app://payment?result=success` that reopens the app. It **proves nothing**: anyone can open it. The app always asks the API.

**Tests** (`SubscriptionTest`, 14): plans per role and language · admins have no plans · checkout creates pending + price copied · wrong-role and inactive plans refused · **the return page doesn't activate, only the server's check does** · renewal starts at the current `ends_at`, and a second renewal → 409 · a new checkout replaces an unpaid one · an old checkout paid meanwhile is activated · cancel, with the payment winning · an expired checkout closes · another user's subscription → 404 · gateway down → nothing left · history and payments · the return and fake pages.

### 8.3 The PayMongo webhook

PayMongo calls `POST /api/v1/webhooks/paymongo` when a checkout is paid. The route is **public** (PayMongo has no token), so the **signature** is the lock:

```text
Paymongo-Signature: t=1700000000,te=5f2b…,li=
expected = HMAC-SHA256( "1700000000." + <raw body>, PAYMONGO_WEBHOOK_SECRET )
accept only if hash_equals(expected, te)      (li for live-mode events)
```

- Only PayMongo and our `.env` know the secret, so nobody else can make a matching signature.
- `hash_equals` compares in constant time, so an attacker can't learn the signature byte by byte from response times.
- With **no** secret configured, every webhook is refused.

After the signature check:

1. The event is logged in `payment_events`. The UNIQUE event id means **the same event twice → "duplicate", nothing happens**.
2. For `checkout_session.payment.paid`, the transaction is found by checkout id → `activate()`.
3. `processed_at` is set → 200.

If step 2 crashes, the answer is 500 and PayMongo retries. The retry is processed, because the event row has no `processed_at` yet (tested).

**`php artisan paymongo:webhook https://<tunnel>/api/v1/webhooks/paymongo`** registers the URL in PayMongo and prints `PAYMONGO_WEBHOOK_SECRET=…` for `.env`. PayMongo can't reach `127.0.0.1`, so during development it needs a tunnel (`cloudflared tunnel --url http://127.0.0.1:8000`). **Without a webhook, payments still activate:** the app's check triggers reconciliation.

**Tests** (`PayMongoWebhookTest`, 10): a signed event activates · the same event twice → once · a new event for a paid checkout → no second period · unsigned / wrong secret / live signature on a test event → 401 and nothing stored · no secret configured → 401 · a live event with the live signature · wrong amount → not activated · unknown checkout and other event types → 200, logged · money for a cancelled checkout still activates · a logged-but-unprocessed event is processed on the retry.

### 8.4 The gates + admin fallback

| Gate | Who | How |
|---|---|---|
| **Go online** | Drivers | `PATCH /drivers/me/availability {is_online: true}` runs the Phase 7 checklist: account active, papers verified, tricycle verified, **subscription active**. One failure → `403 NOT_ELIGIBLE` **with the checklist**, so the app can say exactly what's missing. Going offline always works. Phase 11 adds the location rules |
| **Book a ride** | Passengers | The `subscribed` middleware → `403 SUBSCRIPTION_INACTIVE`. Phase 9 puts it on `POST /rides`. Tested now on a stand-in route |

Both use `SubscriptionService::isActive()`, which computes the status from the dates. The moment `ends_at` passes, the gates close by themselves, with no job and no stored flag to update. A test travels 32 days ahead to prove it.

**Admin manual activation** (`POST /admin/subscriptions/{id}/activate {reason}`) is for a demo when PayMongo can't be reached. It goes through the same `activate()` with `method = manual`, and the audit log records the admin and the reason. A paid subscription can't be activated twice (409).

**Tests** (`SubscriptionGateTest` 6, `AdminSubscriptionTest` 4).

**Settings for the API `.env`** (not committed):

| Setting | Default | Meaning |
|---|---|---|
| `PAYMENT_GATEWAY` | `fake` | `fake` = local test page · `paymongo` = real PayMongo |
| `PAYMONGO_SECRET_KEY` | — | `sk_test_…` from dashboard.paymongo.com → Developers (test mode) |
| `PAYMONGO_WEBHOOK_SECRET` | — | Printed by `php artisan paymongo:webhook …` |
| `PAYMONGO_METHODS` | `gcash,paymaya,card` | What PayMongo's page offers |
| `PAYMENT_APP_RETURN_URL` | `com.papayahatidgo.app://payment` | The app's deep link |

**Part A (API) is complete.**

### 8.5 The payment flow on the phone

**What was added:**

| Piece | Role |
|---|---|
| `@capacitor/browser` 8.0.4 | Opens PayMongo's page in a **Custom Tab**: Chrome's secure in-app browser, with the real address bar. Not the app's WebView, so the app never sees the card or GCash details (decision #2) |
| `AndroidManifest.xml` intent-filter | `com.papayahatidgo.app://payment` opens **this** app. `singleTask` brings back the running app, not a second copy |
| `core/services/subscription.service.ts` | `loadCurrent()` (cached as a signal: Home, Book and Account read it) · `plans()` · `payments()` · `start(planId)` · `cancel(id)` · **`openCheckout(url)`** · **`confirm(id)`** · `clear()` on logout |
| `shared/models/subscription.model.ts` | The API's shapes |
| `shared/utilities/subscription-view.ts` | One place for what the screens show: `peso()` ("₱1,990"), `monthsFree()` (6 months for ₱995 vs 6 × ₱199 → "1 month free"), `subscriptionChip()` (word + icon), `endingSoon()` (3 days), `phDate()` (Philippine calendar) |

**`openCheckout(url)`: waiting for the user to come back.** It listens for **whichever happens first**:

1. `appUrlOpen` with our deep link. The return page's "Back to the app" was followed. It closes the Custom Tab and reports `success` or `cancelled`.
2. `browserFinished`. The user closed the tab by hand: `closed`.

In a desktop browser (`npm start`) there's no Custom Tab and no way back to detect. The page opens in a new browser tab, and the app shows "Check again" at once.

**`confirm(id)`: asking, not believing.** Coming back proves nothing (guarantee #1). `confirm()` asks `GET /subscriptions/{id}` up to 4 times (now, after 1.5 s, 3 s, 5 s) until the period is no longer `pending`. Each request makes the server ask PayMongo (reconciliation), so it works even when the webhook can't reach the PC. Still pending after the last try → "We haven't received your payment yet" + **Check again** / **Cancel this payment**.

**If Android closes the app while the Custom Tab is open** (possible on low-memory phones), nothing is lost. The server still has the pending checkout, and the Subscription page shows "Waiting for your payment of ₱199" with the same two buttons. Opening the page also reconciles, so a payment made in the meantime simply shows as active.

**Tests** (mobile): `subscription-view.spec.ts` (5: pesos, free months, chip mapping, ending-soon rule, Philippine date) · `subscription.service.spec.ts` (5: status signal + clear, checkout request, `confirm()` keeps asking until not pending, gives up and reports pending, refusal → `ApiError`).

### 8.6 The screens

| Screen | What changed |
|---|---|
| **Subscription** (`features/subscription/`, routes `/driver/subscription` and `/passenger/subscription`, full screen) | One page for both roles. The lead says **why** ("…to go online and get rides" / "…to book rides"). Then the status (green "Active until Nov 2, 2026 · 31 days left", red "ended on …", or "waiting for your payment"), the plans as **radio cards** (the Role Card selected look: 3px Deep Papaya border, Papaya Tint, green check), **one** orange "Pay ₱199", the reassurance line (PayMongo's secure page, we never see your card or PIN), a "Test mode" tag in development builds, and the payment history. While active, the plans read "Renew early" ("the new months start when your current ones end") |
| **Driver Home** | ③ shows the real status (Active / Waiting for payment / Ended / Not subscribed) and links to the page. When verified but not subscribed, the next step is **Subscribe**. When verified **and** subscribed, the headline is "You're ready to drive!", ④ says "Coming soon", and the footer shows a disabled **Go online** with "Going online is coming soon." (Phase 11). A warn banner appears 3 days before the end |
| **Passenger Book** | **The gate.** Without an active subscription: "Subscribe to book rides. Plans start at ₱49 a month." + **Subscribe**. With one: the booking preview as before, plus the ending banner. It refreshes on `NavigationEnd` and on resume (the Phase 7 tab-lifecycle fix) |
| **Account** (both roles) | Subscription is a real row with its status in words (`shared/components/subscription-row`) |

**Checked on the emulator** (screenshots `.impeccable/review/p8-*.png`):

| # | Test (§ 5) | Result |
|---|---|---|
| S1 | Pedro opens plans | 3 driver plans: 1 month ₱199 · 6 months ₱995 "1 month free" · 12 months ₱1,990 "2 months free" ✅ |
| S3/S4 | Pay ₱199 → Custom Tab (test page) → Pay (GCash) | Back in the app on its own: "Payment received! You're subscribed until Nov 2, 2026." Server: transaction `paid`, `gcash`. Home: "You're ready to drive!", ③ Active ✅ |
| S12 | Pedro goes online (curl), before and after | Before: 403 `NOT_ELIGIBLE` (API tests). After paying: `is_online: true`, then back offline ✅ |
| S13 | pasahero2 opens Book | The gate: "Subscribe to book rides. Plans start at ₱49 a month." ✅ |
| S11 | 6 months → Pay ₱245 → **Cancel** on the page | "Payment cancelled. Nothing was charged." Server: `cancelled`, transaction `failed / cancelled_by_user`. The plan stays selected ✅ |
| S8 | Pay → **close the tab** without paying → the payment arrives later → **Check again** | "We haven't received your payment yet" → after the late payment, Check again → "Payment received! … until Apr 2, 2027" (6 months) ✅ |
| — | Book and Account after paying | Booking preview shown; Account › Subscription "Active" ✅ |

**Problems found**

| # | Problem | Cause | Fix |
|---|---|---|---|
| 1 | Right after paying, two green boxes said almost the same thing | The status box ("Active until …") showed under the success message | The status box hides in the paid state |
| 2 | The first Pay opened Chrome's "Make Chrome your own" screen | A brand-new emulator's Chrome had never been opened (a real phone has done this long ago) | "Stay signed out", once |
| 3 | VS Code marks message keys like `'sub.title'` red in templates | The Angular language service kept an old list of keys (it even flags Phase 7 keys) | None in code: `ng build` and the tests pass. "Developer: Reload Window" refreshes it |
| 4 | Once, during a fast scripted run, the app ignored taps after the payment tab closed | The Browser plugin's invisible helper screen (`BrowserControllerActivity`) stayed in front | **Not reproduced** in two clean runs (the app was back in front within 2 s each time). Android's Back key clears it. **Watch for it on the Redmi**; if it happens with normal tapping, it's a plugin issue to report and work around |

### 8.7 Finish review (impeccable) + device checks

The `impeccable-finish-reviewer` compared the screens with DESIGN.md and the screenshots, and returned **8 material fixes**. All were applied and checked on the emulator (screenshots `p8v-*.png`):

| # | Finding | Fix |
|---|---|---|
| 1 | **A second payment was one tap away.** In the "not received yet" and "waiting" states the plans and the orange Pay stayed live next to "Check again", so someone who had paid could pay again. It also broke the one-orange-button rule | While a payment may still arrive, the plans and Pay are **hidden**, and **Check again** is the orange button. Errors moved up so a failed check still shows |
| 2 | "Test mode: no real money" followed the **app's build**, not the payment gateway. A dev build on live keys would have said "no real money" | The API returns `test_mode` (fake gateway or an `sk_test_` key) and the tag follows it |
| 3 | Offline, Pay was disabled with no reason | The offline notice is now on the page |
| 4 | "You need an active subscription…" stayed under "Payment received!" | The lead changes once subscribed: "You can go online and get rides." / "You can book rides." |
| 5 | Behind the gate, Book still said "1 / 3 · Move the map to place your pickup" | Step and instruction appear only when booking is open |
| 6 | Passengers have no Home tab, but the paid state said "Back to Home" | "Book a ride" for passengers |
| 7 | Only the chosen plan had a mark | Every card has one: green check (chosen) or Soft Ink empty ring, like the language sheet |
| 8 | "₱199 a month" right next to "₱199" (the student's own catch) could read as a second charge | "Pay month by month" |

DESIGN.md now also records the **Info** notice, **Tags** and **Plan Cards**, which the reviewer found shipped but undocumented.

**A Phase 7 bug found while re-running the tests.** Three Phase 7 test helpers built expiry dates with `now()` (the **UTC** calendar), while the API checks dates on the **Philippine** calendar (`BusinessDate`). Between 00:00 and 08:00 Manila time, "tomorrow in UTC" is "today in Manila", so one test failed. It was first seen at 00:35 on Oct 2, Manila time. The helpers now use `BusinessDate::today()`. The app itself was right all along: this shows why Phase 7 put every date rule on one calendar.

---

## 8. Phase 8 report (summary)

**Result:** ✅ The **done when** condition (phase-0 § M) is met:
- **Pay in test mode → active:** paid on the test checkout from the emulator, confirmed by the server, shown in the app.
- **Gates enforced:** go online → 403 `NOT_ELIGIBLE` without a subscription; booking routes → 403 `SUBSCRIPTION_INACTIVE`. Both close by themselves when the period ends.

| | Phase 8 added | Totals now |
|---|---|---|
| API (`papaya-hatidgo-api`) | payment gateway layer (PayMongo + local test gateway) · subscriptions API · signed, idempotent webhook · reconciliation · gates · admin manual activation · return page · `paymongo:webhook` command · Postman folder | **149 tests, 689 assertions** (41 new) |
| Mobile (`papaya-hatid-go`) | `@capacitor/browser` + deep link · `SubscriptionService` · Subscription page · Home ③ / ready state · Book gate · Account rows | **65 unit tests** (10 new) |

**Deviations from the plan (recorded):**

| Plan said | What was built | Why |
|---|---|---|
| `POST /subscriptions/{id}/renew` (phase-0 § G) | Renewal = `POST /subscriptions` with a plan; the dates stack automatically | One way to buy; the renewal timing rule lives in `activate()` (decision #4) |
| Pay on PayMongo's page | Without keys, our **local test gateway** page (same flow after the page) | No PayMongo account yet (decision #1). Switching is two lines in `.env` (below) |
| Webhook activates the payment | Webhook **and** reconciliation; locally only reconciliation | PayMongo can't reach `127.0.0.1` without a tunnel; reconciliation is guarantee #5 |
| `/auth/me` subscription summary | Unchanged; the screens read `GET /subscriptions/current` | It has more (renewal, pending, days left, test mode) |
| Go online | Only the **gate** (`PATCH /drivers/me/availability`); the button stays disabled in the app | Going online needs the map, location and ride requests (Phase 11) |

**To use real PayMongo test mode** (when the student has an account):

1. dashboard.paymongo.com → Developers → copy the **test** secret key.
2. In the API `.env`: `PAYMENT_GATEWAY=paymongo` and `PAYMONGO_SECRET_KEY=sk_test_…`, then restart `php artisan serve`.
3. Optional, for webhooks: `cloudflared tunnel --url http://127.0.0.1:8000` → `php artisan paymongo:webhook https://<tunnel>/api/v1/webhooks/paymongo` → put the printed `PAYMONGO_WEBHOOK_SECRET=…` in `.env`.
4. Pay with PayMongo's test GCash / card. The app needs no change.

**Still open (carried forward):**

- Real prices (sample prices now) and plan editing → Phase 14 admin.
- Reminder notifications before a subscription ends → Phase 13 (the app shows a banner 3 days before).
- Grace period: 0 days (open decision #13).
- Problem 4 above (the invisible Browser helper screen): watch for it on the Redmi.

**Next:** Phase 9, the ride state machine and matching (backend). Its `POST /rides` gets the `subscribed` gate built here.
