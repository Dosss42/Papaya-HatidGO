# The Download Page and User Manual

One web page that has:

- the **APK download** button;
- a **QR code** that downloads the APK when scanned;
- the **user manual**, for passengers, drivers and the admin, with real screenshots.

It's a plain HTML page. It lives in the **API** repo, so Laravel serves it with no extra hosting:

| Where | Address |
|---|---|
| On this PC | `http://127.0.0.1:8000/download` |
| From a phone on the same Wi-Fi | `http://<this PC's Wi-Fi IP>:8000/download` (see below) |
| Online, after the Railway deploy | `https://<your-app>.up.railway.app/download` |

Files: `papaya-hatidgo-api/public/download/`
- `index.html`: the page (styles and script inside).
- `img/`: the screenshots, as WebP.
- `papaya-hatidgo.apk`: the app. It isn't there until you build it (step 2 below).

`routes/web.php` makes `/download` open `/download/index.html`.

## How the QR code works

The QR code is made **in the browser from the page's own address**, plus `papaya-hatidgo.apk`. So:

- **Opened online:** the code is right automatically.
- **Opened as `127.0.0.1` / `localhost`:** the code would point at "this computer", which a phone can't reach. The page shows a red note saying so.
- **Printing:** *Print the QR code* prints one clean page with only the code, for a bulletin board or the defense.

The QR image comes from the `qrcodejs` library on cdnjs, so the computer showing the page needs the internet.

## Steps to give your professor the APK + QR

1. **Deploy the API online (Railway).** The installed app talks to the API. An APK that points at `127.0.0.1` only works on a phone plugged into this PC with `adb reverse`, never on your professor's phone.
2. **Build the APK for the online API.**
   1. Put the online address in `src/environments/environment.prod.ts` (`apiUrl: 'https://<your-app>.up.railway.app/api/v1'`).
   2. Run:
      ```powershell
      cd "C:\Users\ron28\Desktop\Papaya HatidGO\papaya-hatid-go"
      npm run apk:site
      ```
   This builds the release web code, syncs Android, builds the APK, and copies it to `papaya-hatidgo-api/public/download/papaya-hatidgo.apk`. The script stops if `apiUrl` is still the placeholder.
3. **Commit the API repo (the APK included) and push.** Railway redeploys, and `https://<your-app>.up.railway.app/download` shows the working button and QR code.
4. **Afterwards:** run `npm run android:dev` again before daily development, because step 2 left the release build in `www/`.

The APK is **debug-signed**. That's fine for installing from a website. Android shows its usual "unknown app" and Play Protect prompts, and the manual explains them. A Play Store release would need a private signing key (never committed).

## Showing it before the deploy (same Wi-Fi)

A phone on the same Wi-Fi can open the page from this PC:

1. Start Laravel on all network cards:
   ```powershell
   php artisan serve --host=0.0.0.0 --port=8000
   ```
2. Find the PC's Wi-Fi IP: run `ipconfig` and look at *Wireless LAN adapter Wi-Fi › IPv4 Address*, for example `192.168.1.5`.
3. Open `http://192.168.1.5:8000/download` on the PC. Now the QR code uses that address, and a phone on the same Wi-Fi can scan it.
4. If the phone can't connect, Windows Firewall is blocking port 8000. Allow PHP on *Private* networks when Windows asks.

The **page** works this way, but the **APK** still needs an `apiUrl` the phone can reach. Use the Railway address for the real thing.

## Updating the screenshots

The screenshots were taken from the app's web preview (`ng serve`) at phone size with the local **dev accounts**, so they show sample data:
- Maria Cruz, the passenger;
- Juan Dela Cruz, the driver.

Things that exist only in the dev preview were hidden before each capture:
- the *Diagnostics (dev)* link;
- a "GPS lost" banner caused by the headless browser's fake location.

The capture script isn't part of the project. To retake a screen, take a phone screenshot instead (1080 × 2400 is fine). Save it as WebP with the same name in `img/`.

## Decisions taken

- **The page lives in the API's `public/` folder**, not on a separate host. One Railway service serves the API, the page and the APK.
- **The QR code points straight at the APK**, as the professor asked: scan, then download. The page itself is at `/download`.
- **The manual is in English**, like the app's English mode. Every button name in it is the app's exact English label.
- **Release build size limit:** the component style budget in `angular.json` was raised (warning 6 kB, error 10 kB). The Book screen's styles (7 kB) had failed the release build.
