# Design Brief — Driver Requirements & Verification Flow

> **Status:** ✅ Confirmed (2026-09-29)
> **Produced by:** `/impeccable shape` (planning only, no code)
> **Routes:** `/driver/home` (checklist) · `/driver/account/requirements` (list) · `/driver/account/requirements/:id` (detail + upload) · `/driver/account/vehicle`
> **Built in:** Phase 7 (driver requirements + vehicles)
> **Mode:** Operate. The driver is completing paperwork that stands between them and earning.
> **Platform:** Android, Material 3. System Back always works.
> **Visual world:** Not chosen yet (Phase 5). Structure, content, and behavior only.
> **Copy:** Everyday Taglish; glossary in [passenger-booking.md § 8](passenger-booking.md#8-copy-deck-clarified), plus the status words in § 9 here.
> **Related:** phase-0-analysis.md § D (workflow, statuses, eligibility) · [driver-home brief] (next)

---

## 1. Job and audience

**Who:** a tricycle driver in Papaya, often older than the typical app user, sometimes helped by a family member. Their documents are **physical papers**, sometimes worn, laminated, or folded, and they photograph them with a mid-range phone, often outdoors or under a single bulb at home.

**Job:** "Show Papaya HatidGo that I'm a legitimate driver with a legal tricycle, **so I can start getting passengers.** Then keep my papers current so I don't get cut off."

**Success:**
- A new driver submits everything in **one sitting of about 10 minutes**, or in several sittings without losing progress.
- The driver **always knows what's missing and what to do next**: never a dead end, never an unexplained "rejected".
- A driver with an approved document that's about to expire can **renew without going offline** while the new copy is reviewed.

---

## 2. The requirements (seeded; admin-configurable)

| # | Requirement | Applies to | Expires? | Critical (blocks going online if not valid) |
|---|---|---|---|---|
| 1 | **Driver's license** (front + back) | Driver | ✅ | ✅ |
| 2 | **OR/CR** (Official Receipt / Certificate of Registration) | Vehicle | ✅ (the OR is renewed yearly) | ✅ |
| 3 | **Franchise / MTOP permit** | Vehicle | ✅ | ✅ |
| 4 | **Barangay or police clearance** | Driver | ✅ | ✅ |

All four are required and critical. **Confirmed by the student.**

---

## 3. Selected structure

**A checklist on Driver Home, not a separate onboarding wizard.** The same checklist serves a brand-new driver, a driver under review, and a verified driver whose license is about to expire.

```text
/driver/home  (unverified or ineligible driver)
┌──────────────────────────────┐
│ Status headline              │  e.g. "2 na lang, makakapag-drive ka na!" (2 more, then you can drive)
│                              │
│ ① Tricycle mo        ✓ Tapos │  → /driver/account/vehicle
│ ② Mga dokumento     2 / 4    │  → /driver/account/requirements
│     ✓ License   ⏳ OR/CR     │
│     ✗ MTOP      ✗ Clearance  │
│ ③ Subscription      Wala pa  │  → Account › Subscription
│ ④ Mag-online        🔒       │  (unlocks when ①–③ pass)
│                              │
│ [ NEXT STEP: I-upload ang MTOP ] ← one primary button: the next thing to do
└──────────────────────────────┘
```

### Why a checklist on Home, not a wizard

1. **One design for the whole life of the account.** A wizard only helps once. A driver whose clearance expires in month 7 needs the *same* view: what's missing, and the next step.
2. **Paperwork doesn't happen in one sitting.** A driver may have the license in their wallet but the MTOP at home. A checklist lets them do what they can now and come back, and progress is saved per document.
3. **It shows the finish line.** "2 na lang" (only 2 left) motivates more than "Step 3 of 7" in a wizard that hides how much remains.
4. **The eligibility rule becomes visible.** Checklist items ①–④ are exactly the server's go-online checks (phase-0 § D.3). The driver sees the same rule the server enforces.

### Why one "next step" button

The checklist shows *everything*, but the driver shouldn't have to decide what to do next. The single primary button always points to the **most useful next action**, in this order:
1. Fix a rejected document.
2. Upload a missing document.
3. Add the tricycle.
4. Subscribe.

After that, the Go-online toggle takes over (the driver-home brief).

### Why the tricycle comes first

Vehicle documents (OR/CR, MTOP) belong to a specific tricycle (`driver_documents.vehicle_id`). Registering the tricycle first means those uploads attach to the right vehicle. The checklist lets the driver upload personal documents (license, clearance) before the tricycle, but vehicle documents stay locked until it exists, with the explanation: "Idagdag muna ang tricycle mo." (Add your tricycle first.)

---

## 4. Screens

### 4.1 Requirements list: `/driver/account/requirements`

One row per requirement: **name · status chip · one-line detail**. Tap → detail.

| Status (UI) | Chip | Detail line |
|---|---|---|
| Missing | **Kulang** | "I-upload" |
| `pending` | **Sinusuri** | "Isinumite noong {date}" (submitted on {date}) |
| `approved` | **Aprubado** | "Valid hanggang {date}" (valid until {date}) |
| `approved`, expiring within 30 days | **Mag-e-expire** | "Mag-e-expire sa {n} araw" (expires in {n} days) → renew |
| `rejected` / `resubmission_required` | **Kailangang ayusin** | The admin's reason, first line |
| `expired` | **Expired na** | "I-upload ang bago" (upload the new one) |

**Why `rejected` and `resubmission_required` share one chip:** for the driver, both mean the same thing: *read the reason, fix it, upload again*. Two different labels would make the driver wonder about a difference that doesn't change their action. The server keeps both statuses for the admin's records.

**Order:** "needs action" rows first (Kailangang ayusin → Expired → Kulang → Mag-e-expire), then Sinusuri, then Aprubado. The list reads as a to-do list.

### 4.2 Requirement detail + upload: `/driver/account/requirements/:id`

| Section | Content | Why |
|---|---|---|
| What's needed | Plain description, e.g. "Harap at likod ng driver's license mo." (the front and back of your license) | No bureaucratic names without explanation |
| Current status | The chip + detail. If rejected: **the admin's reason in a highlighted block**, then "Paano ayusin:" (how to fix) with a matching tip. | The reason is the most important text when something is wrong |
| Photo guide | Three short checks with icons: **Kita ang apat na sulok** (all four corners visible) · **Malinaw ang text** (text is clear) · **Walang silaw ng flash** (no flash glare) | Most rejections are unreadable photos. Preventing them saves the driver a review cycle of days. |
| Capture | **[Kumuha ng litrato]** (take a photo, camera) · **[Pumili sa gallery]** (choose from the gallery) · PDF via file picker. License: **two slots, Harap / Likod** (front / back). | Front and back are separate physical sides, so they need separate slots |
| Preview | Thumbnail(s) with **[Ulitin]** (retake) per slot. The driver checks the photo *before* sending. | Catches blurry photos while the paper is still in hand |
| Fields | Document number (optional) · **Expiry date** (required when the requirement expires), using a date picker, not typing | The admin checks the date against the photo; the scheduler uses it for reminders |
| Privacy line | "Makikita lang ito ng admin ng Papaya HatidGo." (only the Papaya HatidGo admin can see this) | True per the security design (private storage, admin-only). Drivers are handing over ID documents and deserve to know who sees them. |
| Primary button | **Isumite** (submit) → uploading "Ina-upload… {45}%" → "Naisumite na" (submitted) | A determinate progress bar, because uploads on weak data take real time |
| History (collapsed) | Earlier submissions: date · result · reason | Proves the review history (`driver_requirement_reviews`) to the driver too |

### 4.3 Tricycle: `/driver/account/vehicle`

Fields: **plate number · body number · color · make/model (optional)**. A status chip (Sinusuri / Aprubado / Kailangang ayusin).

**Editing the plate of a verified tricycle:** the server resets it to pending (phase-0 G). Before saving, an inline warning: **"Kapag binago ang plate number, susuriin ulit ang tricycle mo at hindi ka muna makakapag-online."** (Changing the plate number means your tricycle is reviewed again, and you can't go online until then.) Consequences come before the action, not after.

---

## 5. Key behaviors

### Renewal without going offline
When a driver uploads a replacement for a document that is **still approved and not yet expired**, the old approved document **stays current until the new one is approved**. The driver stays eligible during review. If the old one expires before the new one is approved, the normal expiry rule applies.

→ This changes the ERD rule (see § 8).

### Upload robustness
- **Client-side compression** before upload (about 1600 px on the long side, JPEG ~80%). Phone photos are often 4–8 MB. Compressing keeps them under the 5 MB limit and is kinder to mobile data, while staying readable for the admin.
- **Photos are held in memory only** until the upload succeeds. They're never saved to SQLite or app storage (phase-0 § H: document files are never stored locally). If the app is closed mid-upload, the driver re-takes the photo.
- **Failed upload:** the photo is kept on screen, with "Hindi na-upload. Subukan ulit." (not uploaded, try again) + [Subukan ulit].
- **Camera permission:** a short reason first, "Para makuhanan ang mga dokumento mo." (to photograph your documents), then the system prompt. If denied: "Pumili sa gallery" still works, plus a link to Settings.

### Under review
- **No promised review time.** The admin's workload is unknown, and a missed promise costs trust. Instead: "Aabisuhan ka namin kapag tapos na." (We'll notify you when it's done.) This is backed by notification events 8 in phase-0 § J.
- While documents are pending, the Home headline shows "Sinusuri ng admin ang {n} dokumento mo." (the admin is reviewing {n} of your documents).

### Expiry reminders
- 30 days and 7 days before expiry: a Home banner + the chip changes + a push notification (phase-0 § J event 9, now at 30 **and** 7 days).
- On expiry: the checklist item turns red, the driver is forced offline (if online) with a notification, and the Home headline explains why and what to do next.

---

## 6. Home headline by compliance status

The checklist headline turns the server's `compliance_status` into plain words (phase-0 § D.2):

| `compliance_status` | Headline | Primary button |
|---|---|---|
| `pending_verification` (missing documents) | **{n} na lang, makakapag-drive ka na!** | I-upload ang {next document} |
| `under_review` | **Sinusuri ng admin ang mga dokumento mo.** Aabisuhan ka namin kapag tapos na. | — (or subscribe, if not done yet) |
| `rejected` | **May kailangang ayusin sa {document}.** | Ayusin ang {document} |
| `expired` | **Expired na ang {document} mo.** Hindi ka muna makakapag-online. | I-upload ang bago |
| `suspended` | **Suspended ang account mo.** Makipag-ugnayan sa admin. | — (contact info) |
| `verified` + subscription inactive | **Verified ka na! Mag-subscribe para makapag-online.** | Mag-subscribe |
| `verified` + all eligible | (The Go-online view from the driver-home brief takes over) | — |

---

## 7. Interaction and layout intent

- **Checklist first, detail on demand.** Home shows status at a glance; screens are one tap deep; no nested menus.
- **One primary action per screen.** On the detail screen it's Isumite; on Home it's the next step.
- **Touch targets** ≥ 48 dp. Capture buttons are large, because they may be used with one hand while the other holds the paper.
- **Type** uses Material roles and scales with the system font size (1.3× tested). **Dark theme** is designed.
- **Status chips never rely on color alone.** Each has a word, and an icon where useful (✓ ⏳ ✗), for color-blind users and sunlight.
- **Motion:** only progress (the upload bar) and state changes (chip update). No decoration.

---

## 8. Consequences for the system design

(Update phase-0 once this brief is confirmed.)

| Area | Change | Why |
|---|---|---|
| **ERD: new table `driver_document_files`** | id, driver_document_id FK, file_path (private), mime_type, file_size, side enum(front, back, page) null, sort_order | A license has two sides, and `driver_documents` held only one file. Metadata (number, expiry, status) stays on `driver_documents`. |
| **ERD: `driver_documents` loses** file_path, original_filename, mime_type, file_size | Moved to `driver_document_files` | Normalization: one document, many files |
| **Rule: when `is_current` flips** | On **approval** of the new document, not on upload, *if* the current one is approved and unexpired. Otherwise (missing, rejected, expired), the new upload becomes current immediately. | Renewal without going offline |
| **API** | `POST /drivers/me/documents` accepts **1–2 files** (`files[]`, with `side`) | Front + back in one submission |
| **Notifications (§ J event 9)** | Expiry reminders at **30 and 7 days** | Renewing papers at the LGU/LTO takes time; 7 days alone is too short |
| **Admin (Phase 14)** | Reject / request resubmission needs a **reason**, with quick templates: *Malabo ang litrato · Expired na · Hindi tugma ang pangalan · Kulang ang pahina* (blurry photo · already expired · name doesn't match · missing page) | The driver-side design depends on a clear reason |
| **Upload limits** | 5 MB per file after compression; JPG/PNG/PDF; max 2 files | Same as § D.5, per file |

---

## 9. Copy additions (glossary)

| Concept | ✅ Use |
|---|---|
| Missing document | **Kulang** |
| Under review | **Sinusuri** |
| Approved | **Aprubado** |
| Rejected / resubmission required | **Kailangang ayusin** |
| Expired | **Expired na** |
| Expiring soon | **Mag-e-expire sa {n} araw** |
| Submit | **Isumite** |
| Take a photo / choose from gallery | **Kumuha ng litrato · Pumili sa gallery** |
| Retake | **Ulitin** |
| Front / back | **Harap / Likod** |

---

## 10. Open decisions and anti-goals

**Open decisions (don't invent these while building):**

| # | Decision | Default until decided |
|---|---|---|
| 1 | Is a selfie or face photo needed to match the license? | No (not in the seeded list). Could be added later as a requirement by the admin. |
| 2 | Which clearance counts: barangay, police, or NBI? | Any one (the admin judges); the description says "barangay, police, o NBI clearance" |
| 3 | Review time target for admins | None promised in the app |

**Anti-goals:**
- "Rejected" with no reason, or a reason hidden behind a tap.
- A wizard that must be finished in one go.
- Promising "approved within 24 hours" when nothing guarantees it.
- A renewal that takes an eligible driver offline while the admin reviews it.
- Storing ID photos on the phone after upload.
