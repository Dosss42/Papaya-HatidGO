# Deploying the API on Railway

Puts the Laravel API and its MySQL database online, so the APK works on any phone. Afterwards:
- the admin website can use it;
- the download page is at your Railway address.

## Why the first deploy failed

The build stopped at `composer install` with **exit code 2**.

- `composer.json` allowed PHP 8.3, so Railway installed PHP 8.3.
- Laravel 13 uses Symfony 8.1, which needs **PHP 8.4.1 or newer**. Your laptop runs 8.5, which is why it worked there.

Fixed in the API repo (2026-10-27):

| Change | Why |
|---|---|
| `"php": "^8.4"` in `composer.json` | Railway now installs PHP 8.4+ |
| `ext-pdo_mysql`, `ext-openssl`, `ext-curl`, `ext-mbstring` listed in `composer.json` | Railway installs only the PHP extensions listed there. Without `pdo_mysql`, the next error would have been "could not find driver". |
| No `npm run build` in the API | Railway removes dev packages before building, so the Vite build would fail. The API doesn't need it. |
| `trustProxies('*')` in `bootstrap/app.php` | HTTPS ends at Railway's proxy, so links Laravel makes stay `https://` |
| `php artisan admin:create` | Online there are no dev accounts, so this creates the first admin from Railway variables |
| `/` opens the download page | The plain Railway address shows the manual |

**Push the API repo first.** Railway builds what's on GitHub, not your laptop:
```powershell
cd "C:\Users\ron28\Desktop\Papaya HatidGO\papaya-hatidgo-api"
git push
```

## 1. The database

1. Open your Railway project.
2. Click **+ Create** (or **+ New**) › **Database** › **Add MySQL**. A box named **MySQL** appears.

## 2. The API service settings

Click your API service (the box connected to `papaya-hatidgo-api`), then open **Variables** › **Raw Editor**. Paste this block, then fix the five lines marked `←`:

```env
APP_NAME="Papaya HatidGo"
APP_ENV=staging
APP_DEBUG=false
APP_KEY=base64:PASTE_YOURS_HERE            ← see "APP_KEY" below
APP_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}
LOG_CHANNEL=stderr
LOG_LEVEL=warning

DB_CONNECTION=mysql
DB_HOST=${{MySQL.MYSQLHOST}}
DB_PORT=${{MySQL.MYSQLPORT}}
DB_DATABASE=${{MySQL.MYSQLDATABASE}}
DB_USERNAME=${{MySQL.MYSQLUSER}}
DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}

SESSION_DRIVER=database
CACHE_STORE=database
QUEUE_CONNECTION=sync
FILESYSTEM_DISK=local
MAIL_MAILER=log

PAYMENT_GATEWAY=fake

ADMIN_EMAIL=your-admin-email@gmail.com     ← the admin website login
ADMIN_PASSWORD=ChooseAStrongPassword1      ← at least 8 characters
ADMIN_PHONE=+639XXXXXXXXX                  ← your number in this format
```

Click **Update Variables**.

**APP_KEY.** Make your own on your laptop:
```powershell
cd "C:\Users\ron28\Desktop\Papaya HatidGO\papaya-hatidgo-api"
php artisan key:generate --show
```
It prints `base64:…`. Copy the whole line into `APP_KEY`. It doesn't change your laptop's `.env`. Never put it in a commit or a screenshot.

**What these choices mean:**

- `APP_ENV=staging` is a **demo server**. The test payment page (`PAYMENT_GATEWAY=fake`) is allowed, no money moves, and the dev accounts (Maria, Juan…) are still never created. For real payments, use `APP_ENV=production` with `PAYMENT_GATEWAY=paymongo` and PayMongo keys.
- `${{MySQL.…}}` and `${{RAILWAY_PUBLIC_DOMAIN}}` are filled in by Railway. Type them exactly like that. If your database box has another name, use that name in place of `MySQL`.
- `MAIL_MAILER=log` means forgot-password codes aren't emailed. They go to the server log (**Deploy Logs**), the same as on your laptop. Real emails need a mail service later.
- **Push notifications** stay off online for now (no `FIREBASE_CREDENTIALS`). The app still works; rides update when the app checks.

## 3. Deploy settings

Still in the API service, open **Settings**:

1. **Networking › Generate Domain**. Railway gives an address like `papaya-hatidgo-api-production.up.railway.app`. Write it down.
2. **Deploy › Pre-deploy Command**, so it runs before each start:
   ```
   php artisan migrate --force && php artisan db:seed --force && php artisan admin:create
   ```
   - `migrate --force` creates the tables.
   - `db:seed --force` adds the settings, fares, plans and document types. It's safe to repeat.
   - `admin:create` makes your admin once.
3. **Deploy › Healthcheck Path**: `/up`.

## 4. Keep uploaded documents (Volume)

Drivers' document photos are saved on the server's disk, and Railway wipes that disk on every deploy unless it's a **Volume**:

1. Right-click the API service (or use **+ Create**) › **Volume**, and attach it to the API service.
2. **Mount path:** `/app/storage/app`

## 5. Deploy and check

1. Click **Deploy** (or push again). Watch **Build Logs**, then **Deploy Logs**.
2. Open `https://<your-domain>/up`. It shows a green "Application up" page.
3. Open `https://<your-domain>/`. The download page opens.
4. Test the API: `https://<your-domain>/api/v1/booking-options` answers with JSON (or "Unauthenticated", which also means it's working).

**If it fails,** copy the **red lines** from Build Logs or Deploy Logs and send them.

| Message | Fix |
|---|---|
| `No application encryption key` | `APP_KEY` is missing or incomplete (it must start with `base64:`) |
| `SQLSTATE[HY000] [2002]` / `Connection refused` | The `DB_…` variables don't point to the MySQL box (check its name in `${{MySQL.…}}`) |
| `could not find driver` | The pushed `composer.json` is old: push the API repo |
| `exit code: 2` at `composer install` | Same: the fixed `composer.json` isn't pushed yet |

## 6. Point the app and admin website at it

1. **App:** in `papaya-hatid-go/src/environments/environment.prod.ts`, set `apiUrl: 'https://<your-domain>/api/v1'`. Then:
   ```powershell
   npm run apk:site
   ```
   Upload the APK to the GitHub Release ([download-page.md](download-page.md)).
2. **Admin website:** it calls the API from a browser. Put the same address in its production environment file, then host it (a later step).

## 7. Later (optional)

- **Scheduled jobs** (expiring rides, documents, reminders): add a second service from the same repo, with **Cron Schedule** `* * * * *` and **Start command** `php artisan schedule:run`, and the same variables.
- **Push notifications online:** a `FIREBASE_CREDENTIALS_JSON`-style variable (the code reads a file path today).
- **Real payments:** PayMongo keys and `php artisan paymongo:webhook https://<your-domain>/api/v1/webhooks/paymongo`.
