import { Component, OnDestroy, inject, input, model, signal } from '@angular/core';
import { IonIcon, IonSpinner } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { cameraOutline, documentOutline, imagesOutline, refreshOutline } from 'ionicons/icons';
import { TranslatePipe } from '../../../core/i18n/t.pipe';
import { CapturedFile, PhotoService } from '../../../core/services/photo.service';

/**
 * One photo slot of a document ("Harap", "Likod", or "Litrato"), brief § 4.2:
 * empty → Kumuha ng litrato / Pumili sa gallery / PDF; filled → preview + Ulitin.
 * Two-way bound: <app-photo-slot [label]="…" [(file)]="front" />. The photo lives in memory only;
 * the slot frees the preview memory when the photo is replaced or the slot is destroyed.
 */
@Component({
  selector: 'app-photo-slot',
  imports: [IonIcon, IonSpinner, TranslatePipe],
  template: `
    <div class="slot" [class.slot--filled]="file()">
      <span class="slot__label">{{ label() }}</span>

      @if (busy()) {
        <div class="slot__busy"><ion-spinner name="crescent" aria-hidden="true" /></div>
      } @else if (file(); as f) {
        @if (f.previewUrl) {
          <img class="slot__preview" [src]="f.previewUrl" [alt]="label()" />
        } @else {
          <p class="slot__pdf"><ion-icon name="document-outline" aria-hidden="true" />{{ 'photo.pdfReady' | t: { name: f.filename } }}</p>
        }
        <button type="button" class="hg-button hg-button--outline" (click)="retake()">
          <ion-icon name="refresh-outline" aria-hidden="true" />{{ 'photo.retake' | t }}
        </button>
      } @else {
        @if (photos.canUseCamera) {
          <button type="button" class="hg-button hg-button--outline" (click)="take('camera')">
            <ion-icon name="camera-outline" aria-hidden="true" />{{ 'photo.take' | t }}
          </button>
          <button type="button" class="hg-button hg-button--text" (click)="take('gallery')">{{ 'photo.gallery' | t }}</button>
        }
        <label class="hg-button hg-button--text slot__file">
          {{ (photos.canUseCamera ? 'photo.pdf' : 'photo.file') | t }}
          <input type="file" [accept]="photos.canUseCamera ? 'application/pdf' : 'image/*,application/pdf'" (change)="picked($event)" />
        </label>
      }

      @if (failed()) {
        <p class="hg-field__error" role="alert">{{ 'photo.error' | t }}</p>
      }
    </div>
  `,
  styles: `
    .slot {
      display: grid;
      gap: 8px;
      padding: 14px;
      border-radius: var(--hg-radius);
      background: var(--hg-surface);
      box-shadow: inset 0 0 0 2px var(--hg-field-line);
    }
    .slot--filled { box-shadow: inset 0 0 0 2px var(--hg-green); }
    .slot__label { font-size: 1.1rem; font-weight: 800; color: var(--hg-ink); }
    .slot__preview { display: block; width: 100%; max-height: 260px; object-fit: contain; border-radius: 12px; background: var(--hg-ground); }
    .slot__pdf { display: flex; align-items: center; gap: 8px; margin: 0; font-size: 1rem; color: var(--hg-ink); overflow-wrap: anywhere; }
    .slot__pdf ion-icon { font-size: 28px; flex: none; color: var(--hg-ink-soft); }
    .slot__busy { display: grid; place-items: center; min-height: 120px; }
    .slot__file { position: relative; cursor: pointer; }
    /* The real input covers the button so a tap opens the file picker, but stays invisible. */
    .slot__file input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
    .hg-button ion-icon { font-size: 22px; }
  `,
})
export class PhotoSlotComponent implements OnDestroy {
  protected readonly photos = inject(PhotoService);

  readonly label = input.required<string>();
  readonly file = model<CapturedFile | null>(null);

  protected readonly busy = signal(false);
  protected readonly failed = signal(false);

  constructor() {
    addIcons({ cameraOutline, documentOutline, imagesOutline, refreshOutline });
  }

  protected async take(source: 'camera' | 'gallery'): Promise<void> {
    await this.load(() => this.photos.take(source));
  }

  protected async picked(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const chosen = input.files?.[0];
    input.value = ''; // picking the same file again must still fire (change)
    if (chosen) {
      await this.load(() => this.photos.fromFile(chosen));
    }
  }

  /** "Ulitin": straight back to the camera on a phone; in the browser, empty the slot. */
  protected async retake(): Promise<void> {
    if (this.photos.canUseCamera && !this.file()?.isPdf) {
      await this.take('camera');
    } else {
      this.replace(null);
    }
  }

  ngOnDestroy(): void {
    this.photos.release(this.file());
  }

  private async load(get: () => Promise<CapturedFile | null>): Promise<void> {
    this.failed.set(false);
    this.busy.set(true);
    try {
      const next = await get();
      if (next) {
        this.replace(next); // cancelled (null) keeps the current photo
      }
    } catch (err) {
      console.warn('Photo failed', err);
      this.failed.set(true);
    } finally {
      this.busy.set(false);
    }
  }

  private replace(next: CapturedFile | null): void {
    this.photos.release(this.file());
    this.file.set(next);
  }
}
