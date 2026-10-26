// Makes the app icon and splash from the Papaya HatidGo logo (the SVG in brand-logo.component.ts).
// Needs Google Chrome and puppeteer-core (not a project dependency; once: npm i --no-save puppeteer-core).
//   node scripts/make-icons.mjs assets node_modules/@fontsource/atkinson-hyperlegible-next/files android/app/src/main/res
//   npx capacitor-assets generate --android --iconBackgroundColor "#fff1e6" --splashBackgroundColor "#ffffff" --splashBackgroundColorDark "#ffffff"
// Then run the first command AGAIN (capacitor-assets overwrites the sharp logo layer with a small
// one) and restore the two mipmap-anydpi-v26 XML files and AndroidManifest.xml with git (the tool
// adds a 16.7% inset that shrinks the logo, and reformats the manifest).
import puppeteer from 'puppeteer-core';
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const [out, fonts] = process.argv.slice(2);
mkdirSync(out, { recursive: true });

const INK = '#1c1714';
const TINT = '#fff1e6';
const logo = (w) => `
<svg width="${w}" height="${w * 0.8125}" viewBox="0 0 128 104" xmlns="http://www.w3.org/2000/svg">
  <path d="M46 24 C44 11 51 0 66 -4 C67 11 59 21 46 24 Z" fill="#2e7d32" transform="translate(0 4)"/>
  <path d="M46 24 C37 22 27 18 22 7 C35 4 44 11 46 24 Z" fill="#4caf50" transform="translate(0 4)"/>
  <path d="M46 28 C50 19 55 11 62 5" fill="none" stroke="#1b5e20" stroke-width="2" stroke-linecap="round"/>
  <rect x="8" y="26" width="98" height="9" rx="4.5" fill="#c2410c"/>
  <path d="M84 35 V48" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
  <path d="M15 35 H73 V64 A10 10 0 0 1 63 74 H25 A10 10 0 0 1 15 64 Z" fill="#f57c00"/>
  <rect x="23" y="42" width="32" height="17" rx="4" fill="#ffffff"/>
  <path d="M73 52 H92 A12 12 0 0 1 104 64 V70 H73 Z" fill="#c2410c"/>
  <rect x="76" y="46" width="16" height="7" rx="3.5" fill="${INK}"/>
  <path d="M100 42 L108 80" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
  <path d="M95 41 H106" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
  <circle cx="32" cy="82" r="13" fill="${INK}"/><circle cx="32" cy="82" r="5" fill="#f57c00"/>
  <circle cx="108" cy="82" r="13" fill="${INK}"/><circle cx="108" cy="82" r="5" fill="#f57c00"/>
</svg>`;

// Embedded (a data URL): Chrome won't load a file:// font into a page made with setContent.
const font = 'data:font/woff2;base64,' + readFileSync(join(fonts, 'atkinson-hyperlegible-next-latin-800-normal.woff2')).toString('base64');
const page = (size, bg, body) => `<!doctype html><html><head><style>
  @font-face { font-family: Atkinson; src: url('${font}'); font-weight: 800; }
  html, body { margin: 0; width: ${size}px; height: ${size}px; background: ${bg}; }
  body { display: grid; place-items: center; font-family: Atkinson, sans-serif; }
</style></head><body>${body}</body></html>`;

const images = {
  // Legacy square icon (older Android, the download page): the logo on Papaya Tint.
  'icon-only.png': [1024, TINT, `<div style="transform: translateY(-20px)">${logo(760)}</div>`],
  // Adaptive icon (Android 8+): the logo alone, small enough for the round mask's safe zone...
  'icon-foreground.png': [1024, 'transparent', `<div style="transform: translateY(-10px)">${logo(600)}</div>`],
  // ...over a plain Papaya Tint layer.
  'icon-background.png': [1024, TINT, ''],
  // Splash: as on Get Started, the logo on a tint disc, then the two-colour wordmark.
  'splash.png': [2732, '#ffffff', `
    <div style="display: grid; justify-items: center; gap: 70px">
      <div style="display: grid; place-items: center; width: 760px; height: 760px; border-radius: 50%; background: ${TINT}">${logo(520)}</div>
      <div style="font-size: 150px; font-weight: 800; letter-spacing: -1px">
        <span style="color: #c2410c">Papaya</span> <span style="color: #2e7d32">HatidGo</span>
      </div>
    </div>`],
};
images['splash-dark.png'] = images['splash.png']; // the app is always white (DESIGN.md)

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args: ['--allow-file-access-from-files'],
});
const tab = await browser.newPage();
for (const [name, [size, bg, body]] of Object.entries(images)) {
  await tab.setViewport({ width: size, height: size });
  await tab.setContent(page(size, bg, body), { waitUntil: 'load' });
  await tab.evaluate(() => document.fonts.ready);
  await tab.screenshot({ path: join(out, name), omitBackground: bg === 'transparent' });
  console.log('made', name);
}
await browser.close();

// The adaptive icon's logo layer, rendered at every density straight from the SVG (108dp each):
// sharper than resizing one image. Same proportions as icon-foreground.png (600 of 1024).
const res = process.argv[4];
if (res) {
  const b2 = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const t2 = await b2.newPage();
  for (const [dpi, px] of Object.entries({ mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 })) {
    await t2.setViewport({ width: px, height: px });
    await t2.setContent(page(px, 'transparent', `<div style="transform: translateY(${(-10 * px) / 1024}px)">${logo((600 * px) / 1024)}</div>`));
    await t2.screenshot({ path: join(res, `mipmap-${dpi}`, 'ic_launcher_foreground.png'), omitBackground: true });
    console.log('made', `mipmap-${dpi}/ic_launcher_foreground.png`, `${px}px`);
  }
  await b2.close();
}
