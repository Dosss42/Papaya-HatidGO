import { Injectable } from '@angular/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { JPEG_QUALITY, MAX_SIDE_PX, RECOMPRESS_ABOVE_BYTES, compressImage } from '../../shared/utilities/image-compress';

/** A photo or PDF ready to upload. Lives in MEMORY only (phase-0 § H: never stored on the phone). */
export interface CapturedFile {
  blob: Blob;
  filename: string;
  /** For <img [src]> previews; call PhotoService.release() when it's no longer shown. */
  previewUrl: string | null; // null for PDFs
  isPdf: boolean;
}

/**
 * Taking document photos (Phase 7, brief § 4.2 + § 5).
 * - Camera / gallery through @capacitor/camera, resized NATIVELY to ≤ 1600 px, JPEG 80%,
 *   never saved to the gallery (no permission needed, and ID photos don't stay on the phone).
 * - A picked file (PDF or image) through the page's file input → fromFile().
 * - Anything still over 4.5 MB is re-compressed (the API limit is 5 MB).
 */
@Injectable({ providedIn: 'root' })
export class PhotoService {
  /** The camera plugin's own screens exist only on Android; the browser uses the file input. */
  readonly canUseCamera = Capacitor.isNativePlatform();

  /** @returns null when the user backs out of the camera or gallery (not an error). */
  async take(source: 'camera' | 'gallery'): Promise<CapturedFile | null> {
    try {
      const photo = await Camera.getPhoto({
        source: source === 'camera' ? CameraSource.Camera : CameraSource.Photos,
        resultType: CameraResultType.Uri, // a file path, not a huge base64 string in memory
        quality: Math.round(JPEG_QUALITY * 100),
        width: MAX_SIDE_PX,
        height: MAX_SIDE_PX,
        correctOrientation: true,
        saveToGallery: false,
        allowEditing: false,
      });
      if (!photo.webPath) {
        return null;
      }
      const blob = await (await fetch(photo.webPath)).blob();
      return this.wrap(await this.ensureSmall(blob), `photo-${Date.now()}.jpg`, false);
    } catch (err) {
      if (this.isCancel(err)) {
        return null;
      }
      throw err;
    }
  }

  /** A file chosen with <input type="file">: PDFs pass through, images are compressed. */
  async fromFile(file: File): Promise<CapturedFile> {
    if (file.type === 'application/pdf') {
      return this.wrap(file, file.name, true);
    }
    return this.wrap(await compressImage(file), this.jpgName(file.name), false);
  }

  /** Free the preview's memory (object URL) when the photo is removed or uploaded. */
  release(file: CapturedFile | null | undefined): void {
    if (file?.previewUrl) {
      URL.revokeObjectURL(file.previewUrl);
    }
  }

  private async ensureSmall(blob: Blob): Promise<Blob> {
    return blob.size > RECOMPRESS_ABOVE_BYTES ? compressImage(blob, 0.7) : blob;
  }

  private wrap(blob: Blob, filename: string, isPdf: boolean): CapturedFile {
    return { blob, filename, isPdf, previewUrl: isPdf ? null : URL.createObjectURL(blob) };
  }

  private jpgName(name: string): string {
    return `${name.replace(/\.[^.]+$/, '') || 'photo'}.jpg`;
  }

  /** The plugin rejects with a "cancelled" message when the user backs out. */
  private isCancel(err: unknown): boolean {
    const message = err instanceof Error ? err.message : String(err);
    return /cancel/i.test(message);
  }
}
