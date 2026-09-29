// Forwards port 8000 on EVERY connected Android device/emulator to this PC, so the app's
// http://127.0.0.1:8000 reaches `php artisan serve`. Plain `adb reverse` fails with
// "more than one device" when a phone and an emulator are both connected.
// Usage: npm run adb:reverse   (run again after reconnecting a phone or restarting an emulator)
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const adb = process.env.LOCALAPPDATA
  ? join(process.env.LOCALAPPDATA, 'Android', 'Sdk', 'platform-tools', 'adb.exe')
  : 'adb';
const run = (args) => execFileSync(adb, args, { encoding: 'utf8' }).trim();

const devices = run(['devices'])
  .split('\n')
  .slice(1)
  .map((line) => line.trim().split(/\s+/))
  .filter(([, state]) => state === 'device')
  .map(([serial]) => serial);

if (devices.length === 0) {
  console.error('No device connected. Plug in the phone (USB debugging on) or start the emulator.');
  process.exit(1);
}

for (const serial of devices) {
  run(['-s', serial, 'reverse', 'tcp:8000', 'tcp:8000']);
  console.log(`✔ ${serial}: device 127.0.0.1:8000 → this PC :8000`);
}
