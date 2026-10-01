/**
 * Photo compression for document uploads (driver-requirements brief § 5: ~1600 px long side,
 * JPEG ~80%). Phone photos are 4–8 MB; compressed they're a few hundred KB, still readable for
 * the admin, under the API's 5 MB limit, and kind to mobile data.
 *
 * On Android the camera plugin already resizes natively (faster on low-end phones); this is the
 * safety net for pictures that are still too big and for images chosen with the file picker.
 */

export const MAX_SIDE_PX = 1600;
export const JPEG_QUALITY = 0.8;
/** The API refuses files over 5 MB; stay safely below it. */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const RECOMPRESS_ABOVE_BYTES = 4.5 * 1024 * 1024;

/** The size that fits inside max × max, keeping the proportions; never enlarges. */
export function fitWithin(width: number, height: number, max = MAX_SIDE_PX): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= max) {
    return { width, height };
  }
  const scale = max / longest;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/**
 * Re-encode an image as a JPEG that fits within MAX_SIDE_PX. Uses the photo's EXIF orientation,
 * so a portrait photo of a license isn't saved sideways.
 */
export async function compressImage(image: Blob, quality = JPEG_QUALITY): Promise<Blob> {
  const bitmap = await createImageBitmap(image, { imageOrientation: 'from-image' });
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas 2D is not available');
    }
    context.drawImage(bitmap, 0, 0, width, height);

    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not encode the image'))), 'image/jpeg', quality),
    );
  } finally {
    bitmap.close();
  }
}

/** Human-readable size for diagnostics and error messages: 845 KB, 2.3 MB. */
export function formatBytes(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
