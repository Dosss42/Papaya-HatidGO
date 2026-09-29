# Product

<!-- impeccable:product-schema 1 -->

## Platform

android

The mobile app in this repository is the primary product. It ships as a native Android app via Capacitor and is not a responsive website. It serves passengers and drivers from one Ionic project using role-based navigation; splitting it into separate passenger and driver apps is a possible future step.

A separate Angular **Admin Web Dashboard** is a supporting system that will be built later. When it is built, it needs its own `web` product/surface context.

## Stack

- **Mobile (this repo):** Ionic 9 + Angular 22 (standalone) + TypeScript. Capacitor provides native Android access through Android Studio. SQLite is used for local storage only.
- **Backend (separate project):** Laravel (PHP) REST API with Laravel Sanctum authentication and a MySQL database. MySQL is the single source of truth.
- **Admin (separate project, later):** Angular + TypeScript, styled with Bootstrap or Tailwind (**open decision**). It talks to the same Laravel API.
- **Integrations, each behind its own abstraction:**
  - GPS: Capacitor geolocation behind `LocationService`.
  - Maps: behind `MapService`, so the provider is replaceable. **Open decision:** which provider.
  - Push notifications: Firebase Cloud Messaging.
  - Payments: behind `PaymentService`, so the provider is replaceable. Online payment for **subscriptions** is in the MVP; ride fares stay cash. **Confirmed:** payments run in the gateway's **test/sandbox mode only**; no real money moves. **Gateway: PayMongo** (confirmed; Xendit was tried and set aside). It stays behind `PaymentService`, so it can still be swapped.
- **Tooling:** VS Code, Android Studio, Git/GitHub, Postman, Docker, Android Emulator, physical Android device.

## Users

- **Passengers (primary):** residents of a Philippine town who want a tricycle ride, either one-way or two-way (round trip, such as home → school → home). They book on an Android phone, often outdoors and on the move. They need to know quickly that a driver is coming, who it is, which tricycle it is, and roughly what the ride will cost.
- **Tricycle drivers (primary):** use the same app from the driver-role side. Before they can operate, they must meet the platform's requirements: verified identity and documents, a valid vehicle, and an active subscription. Once eligible, they go online, receive and accept requests, carry out one-way or two-way rides, and track their earnings.
- **Administrators:** operate the service from the web dashboard. They review driver requirements, verify drivers and vehicles, configure fares, ride types, requirements and subscription plans, monitor rides, handle complaints, and review reports and audit logs. They do not use the mobile app.

## Product Purpose

Papaya HatidGo is a mobile-first tricycle ride-hailing and transportation management system. It connects passengers with verified drivers through GPS-based one-way and two-way ride requests. It also covers configurable fare calculation, driver compliance verification, subscription-based system maintenance, notifications, ratings, and administrative monitoring.

It is a BSIT academic **case study**, not a production deployment. What matters most is a correct, well-documented protocol: the flows, business rules, data design, and system behavior should be sound and defensible, even where real-world pieces (payments, service area, fare rates) are simulated or sample values. The goal is a small but professionally structured tricycle platform, not a giant Grab clone. Success means the following work, and the student can fully explain them:
- a working, installable Android app with an end-to-end ride flow (request → eligible-driver match → accept → arrive → ride, including the return leg for two-way → complete → rate);
- running on a physical device against the Laravel/MySQL backend;
- with the driver compliance and basic subscription rules enforced by the server.

## Positioning

A local, tricycle-specific hatid service for one real town (Papaya), not a generic car ride-hailing clone. Several features follow how tricycles are actually used locally:
- **Round-trip rides:** a two-way ride where the driver waits and brings the passenger back.
- **Transparent fares:** a local formula set by the operator.
- **Cash payment:** ride fares are paid in cash directly to the driver.
- **Accountable drivers:** only drivers whose documents and vehicles are verified can operate.
- **Maintenance subscriptions:** both drivers and passengers hold an active subscription that funds system maintenance, paid online in the app.
- **Language:** English or Taglish, chosen by the user (asked on first open, changeable in Account). Taglish is the default until someone chooses (decision 2026-09-29, Phase 7).

## Operating Context

- **Service area:** a real town referred to as "Papaya." **Open decision:** confirm the exact municipality and barangays. It is possibly General Tinio, Nueva Ecija, which was historically called Papaya, but this is unconfirmed.
- **Devices:** Android phones, from the emulator to a physical device. Assume mid- and low-range hardware, outdoor sunlight, one-handed use, and patchy mobile data.
- **Ride types:** `one_way` (pickup → destination) and `two_way` (pickup → destination → back to pickup). The admin can enable or disable each type.
  - A two-way ride records its outbound and return distance and fare, plus return/waiting details. It tracks the return leg as internal state, such as `return_required`, `return_started`, `return_completed`, and `waiting_minutes`.
  - It should not add new top-level statuses unless the business logic truly requires them. The exact fields are finalized during ERD design.
- **Ride lifecycle:** `requested → accepted → driver_arriving → arrived → in_progress → completed`, plus `cancelled`. The backend enforces every transition; the frontend never sets a status arbitrarily.
- **Fare:**
  - One-way fare = `Base Fare + (Distance × Rate per km)`.
  - Two-way fare = `Outbound Fare + Return Fare + optional Waiting Fee`.
  - A service fee is configurable.
  - The server calculates every fare, and the admin configures the rates. Nothing is hardcoded.
  - The ₱30 base fare and ₱10/km rate in the brief are **examples only**.
- **Ride payment:** cash, paid by the passenger to the driver. The in-app fare is an estimate.
- **Driver eligibility (checked by the server before any request is sent):** the driver must pass every check below. If any critical check fails, the driver receives no requests.
  - online;
  - verified;
  - all required documents valid and not expired;
  - vehicle valid;
  - subscription active;
  - within the service area.
- **Driver requirements workflow:**
  - Submission and review: register → submit and upload documents → pending review → the admin approves or rejects them (a rejected driver corrects and resubmits) → verified → can go online.
  - The admin defines each requirement: its name, whether it is required, whether it expires, its document type, and its rules.
  - Requirement statuses: `pending`, `approved`, `rejected`, `expired`, `resubmission_required`.
  - Overall driver statuses: `pending_verification`, `under_review`, `verified`, `rejected`, `suspended`, `expired`.
  - When a critical requirement expires, the driver can be blocked from going online automatically.
- **Subscriptions:**
  - Drivers and passengers share one architecture: a user has a subscription, which links to a plan and to transactions.
  - Plans are configured by the admin: name, user type, price, duration in months, benefits, and status. **Confirmed starting plans: 1, 6, and 12 months** for both passengers and drivers. Monthly is the low-cost default, since users earn and spend in daily cash. The longer plans are priced as "months free" (about 5× and 10× the monthly price), with real amounts set by the admin. Renewal is manual (no stored cards).
  - Statuses: `active`, `pending`, `expired`, `cancelled`, `suspended`, `past_due`.
  - The rules are centralized in a `SubscriptionService` and are configurable.
  - **Confirmed:** subscriptions are **required for both roles in the MVP**.
    - A **passenger** needs an active subscription to **book a ride**.
    - A **driver** needs an active subscription to **go online**.
    - Without one, a user can still register, log in, manage their profile, view history, and subscribe or renew. Only booking (passengers) and going online (drivers) are blocked.
  - The server checks subscription status at booking time and at go-online time. The app explains the block in plain Taglish and links straight to renewal.
  - **Subscription payments are online in the MVP**, through a payment provider behind `PaymentService`:
    - The app starts a checkout through Laravel.
    - The provider confirms the result to Laravel through a verified webhook.
    - Only then does Laravel record the transaction and activate the subscription. The app never marks a payment as successful by itself.
- **Notifications:**
  - Passengers: ride events, including the start of the return trip, plus subscription expiry and renewal.
  - Drivers: new request, passenger cancelled, subscription reminder, requirement approved, rejected, or expiring.
  - Admins: new driver registration, new submission, requirement expiring, subscription or payment issues, system alerts.

## Capabilities and Constraints

**MVP (required):**
- authentication;
- passenger and driver experiences in the mobile app, plus the admin dashboard;
- GPS and maps;
- one-way and two-way rides, fare estimation, driver matching, and ride status;
- driver requirements and verification;
- subscriptions for passengers and drivers (required to book or go online), with online subscription payment;
- notifications, ride history, and ratings.

**Later phase:** online payment of ride fares, advanced notifications, messaging, calling, earnings analytics, complaints, support tickets, trip sharing, SOS.

**Future phase, not part of the MVP:** promotions, wallet, loyalty, advanced matching, scheduled rides, advanced analytics, multi-stop rides, multiple vehicle types, iOS.

**Passenger:**
- Account: register, login, logout, forgot password, profile, change password, settings.
- Rides: detect location, pickup and destination, choose ride type, fare estimate, request, cancel, track, view driver and vehicle, history, receipt, rate driver.
- Subscription: view plans and status, subscribe, renew, view expiry and payment history, receive reminders.
- Later: call or message the driver, SOS, share a trip, report a driver or ride, support.

**Driver:**
- Account: register, login, logout, profile, change password, account status.
- Requirements: submit and upload documents, view verification status and rejections, resubmit, see expiry dates and reminders.
- Vehicle: register the tricycle, vehicle documents and verification status.
- Rides: go online or offline, receive requests (see the passenger, pickup, destination, and ride type), accept or decline, arrive, start, run the two-way return leg, complete, cancel when permitted, history.
- Earnings: daily, weekly, and monthly totals and history.
- Subscription: view, subscribe, renew, view expiry and history, receive reminders.

**Admin (web, later):**
- Dashboard, users (passengers and drivers), and driver requirements (pending, approved, rejected, expiring, expired).
- Verification actions: approve, reject, request resubmission, suspend, reactivate.
- Vehicles, and ride monitoring (active, completed, cancelled, two-way).
- Settings for fares and ride types.
- Subscriptions (plans, active, expired, transactions, maintenance revenue) and payments.
- Ratings, complaints, reports, notifications, system settings, audit logs.

**Data:**
- **MySQL entities:** users, passengers, drivers, vehicles, driver_requirements, driver_documents, driver_requirement_reviews, ride_requests, ride_locations, fare_settings, subscription_plans, subscriptions, subscription_transactions, ratings, notifications, complaints, support_tickets, audit_logs.
- The ERD is reviewed before any migration is written.
- **SQLite on the device:** a cache and offline layer only. Candidate tables are `local_user`, `cached_rides`, `app_settings`, and `pending_sync`. Every table needs a stated reason, sensitive data is never stored there, and SQLite never mirrors MySQL.

**Security:**
- **Accounts and API:** hashed passwords, token auth, role-based access control, server-side validation, rate limiting, secure token storage, HTTPS in production.
- **The server has the final say:** the server alone decides eligibility, fares, and subscription status, and payments are verified on the server.
- **Driver documents:**
  - Uploads are validated by file type and size.
  - Documents are stored privately and are viewable only by authorized admins.
  - Document URLs are never public.
- **Audit logging:** important admin actions are logged with the admin, action, target, timestamp, and previous and new values. This covers approvals and rejections, suspensions, fare changes, plan changes, and cancellations made by an admin.
- **Secrets:** never committed to the repository.

**Architecture:**
- Feature-oriented folders: `core/`, `shared/`, and `features/{auth,passenger,driver,rides,map,profile,notifications,…}`.
- Business logic lives in services, not in pages.
- Planned mobile services: Auth, Ride, Passenger, Driver, Vehicle, Location, Map, Fare, DriverCompliance, Subscription, Payment, Notification, SQLite, Sync. Each has one clear responsibility.
- Laravel keeps its controllers thin and puts business logic in services: Ride, DriverMatching, Fare, DriverCompliance, Subscription, Payment, Notification, Location, Report.

**Current state:** a blank Ionic Angular starter with no product screens and no Capacitor yet.

**Open decisions:**

- **Passenger subscription benefits:** a subscription is required to book, but any extra member benefits (reduced service fees, priority) are not defined. Do not promise benefits until they are.
- **Subscription plan prices and trial/grace period:** whether new users get a free first period or a grace period after expiry before booking or going online is blocked.
- **Two-way waiting fee (still undecided):** whether it applies at all, and if so whether it is a free-wait-then-per-minute rule or a flat fee. Keep the fare model able to hold a waiting fee of zero.
- **Cancellation rules:** when each party may cancel, including during a two-way ride.
- ~~Driver requirements list~~ **Decided:** driver's license (front + back), OR/CR, franchise/MTOP permit, and barangay/police/NBI clearance, all required and critical (admin can change them). Still open: whether a selfie/face match is ever required.
- **Map provider.**

## Brand Commitments

- **Name:** Papaya HatidGo ("hatid" means to bring or drop someone off).
- **UI language:** English or Taglish (user setting; Taglish default), written for local passengers and drivers. Pure Tagalog was considered and left out: tech words have no natural Tagalog form and it would be a third copy of every text.
- **Visual identity:** none exists yet (no logo or palette). The only asset is the default Ionic favicon.

## Evidence on Hand

- **What exists:** the student's two development briefs, covering phases, roles, ride types, the lifecycle, compliance, subscriptions, entities, and the API plan.
- **What does not exist:** real users, riders, testimonials, ride data, partner operators, an official LGU fare matrix, final subscription prices, or confirmed subscription benefits.
- **Rule for future work:** do not invent ridership numbers, reviews, driver counts, official fare rates, plan prices, or member benefits. Use clearly labeled sample data instead, such as "₱XXX / month".

## Product Principles

1. **Trust through status.** A passenger always knows the ride's current status, including which leg of a two-way ride is under way, who the driver is, which tricycle it is, and the expected fare.
2. **Only eligible drivers operate.** Verification, valid documents, a valid vehicle, and an active subscription decide eligibility. The server enforces this and explains it clearly to the driver: what is missing and what to do next.
3. **Server is truth.** Status transitions, fares, matching, eligibility, subscriptions, and authorization are all decided by the backend. The app displays information and sends requests; it never decides.
4. **Local and plain-spoken.** Build around tricycles, cash, round trips, Taglish, and one town, reflecting how rides actually work in Papaya rather than a big-city ride-hailing template.
5. **Built to be understood, grown in increments.** Keep implementations simple, explicit, and configurable, with one responsibility per service. Build the reliable core first and add advanced features progressively.

## Accessibility & Inclusion

- **Outdoor, one-handed use:** readable and tappable in bright sun and with one hand, with large touch targets and strong contrast.
- **Plain language:** passengers and drivers have varied literacy and experience with technology. Prefer plain Taglish over jargon. This matters most in requirement and subscription status messages.
- **Low-end devices:** acceptable performance on low-end Android phones and slow connections, with clear, recoverable states for denied GPS permission, no internet, and failed uploads.
