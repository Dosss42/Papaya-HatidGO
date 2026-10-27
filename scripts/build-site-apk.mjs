// Builds the APK for the download page (papaya-hatidgo-api/public/download/) and copies it there.
//   npm run apk:site
// The phone that installs it talks to the ONLINE API, so environment.prod.ts must hold the real
// HTTPS address first (e.g. https://<your-app>.up.railway.app/api/v1). This script stops if it
// still holds the placeholder. Debug-signed: installs fine from a website (no Play Store needed).
import { execSync } from 'node:child_process';
import { copyFileSync, existsSync, readFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const prod = readFileSync(join(root, 'src/environments/environment.prod.ts'), 'utf8');
const api = prod.match(/apiUrl:\s*'([^']+)'/)?.[1] ?? '';
if (!api.startsWith('https://') || api.includes('example.invalid')) {
  console.error(`environment.prod.ts apiUrl is "${api}".`);
  console.error('Put the online API address there first (https://…/api/v1), then run this again.');
  process.exit(1);
}

const run = (cmd, cwd = root) => execSync(cmd, { cwd, stdio: 'inherit' });
console.log(`Building the app for ${api}`);
run('node scripts/ensure-map-key.js');
run('npx ng build');
run('npx cap sync android');
run(process.platform === 'win32' ? 'gradlew.bat assembleDebug' : './gradlew assembleDebug', join(root, 'android'));

const apk = join(root, 'android/app/build/outputs/apk/debug/app-debug.apk');
const site = join(root, '../papaya-hatidgo-api/public/download');
if (!existsSync(site)) {
  console.error(`The download site folder wasn't found: ${site}`);
  process.exit(1);
}
copyFileSync(apk, join(site, 'papaya-hatidgo.apk'));
console.log(`Copied the APK (${(statSync(apk).size / 1048576).toFixed(1)} MB) to ${join(site, 'papaya-hatidgo.apk')}`);
