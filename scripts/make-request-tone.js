// Generates src/assets/sounds/request.wav: the driver's incoming-request tone (Phase 11).
// A short, distinct two-note chime (E6 then A6, ~0.9 s), synthesized here so the app bundles an
// original sound (no licence questions) that plays without a network (driver-home brief § 7).
// Run once: node scripts/make-request-tone.js
const fs = require('fs');
const path = require('path');

const rate = 22050;
const notes = [
  { freq: 1318.5, start: 0.0, length: 0.38 }, // E6
  { freq: 1760.0, start: 0.42, length: 0.48 }, // A6
];
const total = Math.ceil(rate * 0.95);
const samples = new Int16Array(total);

for (const note of notes) {
  const from = Math.floor(note.start * rate);
  const count = Math.floor(note.length * rate);
  for (let i = 0; i < count && from + i < total; i++) {
    const t = i / rate;
    // Quick attack, smooth decay: a bell-like "ding", not a harsh beep.
    const envelope = Math.min(1, t / 0.01) * Math.exp(-4.5 * t);
    const tone = Math.sin(2 * Math.PI * note.freq * t) + 0.35 * Math.sin(2 * Math.PI * note.freq * 2 * t);
    const value = samples[from + i] + tone * envelope * 0.55 * 32767;
    samples[from + i] = Math.max(-32768, Math.min(32767, value));
  }
}

// A plain 16-bit mono PCM WAV file: 44-byte header + samples.
const data = Buffer.from(samples.buffer);
const header = Buffer.alloc(44);
header.write('RIFF', 0);
header.writeUInt32LE(36 + data.length, 4);
header.write('WAVE', 8);
header.write('fmt ', 12);
header.writeUInt32LE(16, 16); // fmt chunk size
header.writeUInt16LE(1, 20); // PCM
header.writeUInt16LE(1, 22); // mono
header.writeUInt32LE(rate, 24);
header.writeUInt32LE(rate * 2, 28); // byte rate
header.writeUInt16LE(2, 32); // block align
header.writeUInt16LE(16, 34); // bits per sample
header.write('data', 36);
header.writeUInt32LE(data.length, 40);

const out = path.join(__dirname, '..', 'src', 'assets', 'sounds', 'request.wav');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, Buffer.concat([header, data]));
console.log(`wrote ${out} (${header.length + data.length} bytes)`);
