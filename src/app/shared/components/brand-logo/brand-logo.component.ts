import { Component, input } from '@angular/core';

/**
 * The Papaya HatidGo logo: a tricycle (roofed sidecar + motorcycle), side view, with a papaya
 * leaf growing from the roof. Recreated as authored SVG from the user's AI mockup.
 * Wheels and the window use theme tokens (--hg-ink, --hg-ground), so they follow the palette.
 * Decorative: the app name is always written next to it.
 */
@Component({
  selector: 'app-brand-logo',
  template: `
    <svg
      [attr.width]="size()"
      [attr.height]="size() * 0.8125"
      viewBox="0 0 128 104"
      aria-hidden="true"
      focusable="false"
    >
      <!-- papaya leaf: two lobes and a stem growing from the roof -->
      <path d="M46 24 C44 11 51 0 66 -4 C67 11 59 21 46 24 Z" fill="#2e7d32" transform="translate(0 4)" />
      <path d="M46 24 C37 22 27 18 22 7 C35 4 44 11 46 24 Z" fill="#4caf50" transform="translate(0 4)" />
      <path d="M46 28 C50 19 55 11 62 5" fill="none" stroke="#1b5e20" stroke-width="2" stroke-linecap="round" />
      <!-- roof: one canopy over the sidecar AND the driver, as on a Philippine tricycle -->
      <rect x="8" y="26" width="98" height="9" rx="4.5" fill="#c2410c" />
      <!-- roof post over the driver's seat -->
      <path d="M84 35 V48" fill="none" [attr.stroke]="'var(--hg-ink)'" stroke-width="4" stroke-linecap="round" />
      <!-- sidecar cab -->
      <path d="M15 35 H73 V64 A10 10 0 0 1 63 74 H25 A10 10 0 0 1 15 64 Z" fill="#f57c00" />
      <!-- cab window -->
      <rect x="23" y="42" width="32" height="17" rx="4" [attr.fill]="'var(--hg-ground)'" />
      <!-- motorcycle body: seat, tank, front fender -->
      <path d="M73 52 H92 A12 12 0 0 1 104 64 V70 H73 Z" fill="#c2410c" />
      <rect x="76" y="46" width="16" height="7" rx="3.5" [attr.fill]="'var(--hg-ink)'" />
      <!-- fork and handlebar -->
      <path d="M100 42 L108 80" fill="none" [attr.stroke]="'var(--hg-ink)'" stroke-width="5" stroke-linecap="round" />
      <path d="M95 41 H106" fill="none" [attr.stroke]="'var(--hg-ink)'" stroke-width="5" stroke-linecap="round" />
      <!-- wheels -->
      <circle cx="32" cy="82" r="13" [attr.fill]="'var(--hg-ink)'" />
      <circle cx="32" cy="82" r="5" fill="#f57c00" />
      <circle cx="108" cy="82" r="13" [attr.fill]="'var(--hg-ink)'" />
      <circle cx="108" cy="82" r="5" fill="#f57c00" />
    </svg>
  `,
  styles: [':host { display: inline-block; line-height: 0; }'],
})
export class BrandLogoComponent {
  /** Width in px (height follows the 128 × 104 artwork). */
  readonly size = input(128);
}
