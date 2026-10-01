import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { I18nService } from '../i18n/i18n.service';
import { Checklist, DocumentFields, DriverDocument, UploadFile } from '../../shared/models/driver.model';
import { UPLOAD_TIMEOUT_MS, apiCall } from './api-call';

/**
 * The driver's requirements checklist and document uploads (API: Phase 7 step 7.3).
 * The checklist is what Driver Home and the requirements list show; it's reloaded after every
 * upload, so the screens always show the server's verdict (compliance status, reasons, expiry).
 * @throws ApiError on every failure (FILES_INVALID, TRICYCLE_REQUIRED, VALIDATION_FAILED, NETWORK, …)
 */
@Injectable({ providedIn: 'root' })
export class DriverDocumentsService {
  private readonly http = inject(HttpClient);
  private readonly i18n = inject(I18nService);
  private readonly base = `${environment.apiUrl}/drivers/me`;

  private readonly current = signal<Checklist | null>(null);
  readonly checklist = this.current.asReadonly();

  async loadChecklist(): Promise<Checklist> {
    const checklist = await apiCall(this.http.get<Checklist>(`${this.base}/requirements`), (k) => this.i18n.t(k));
    this.current.set(checklist);
    return checklist;
  }

  /**
   * Upload one requirement as multipart/form-data: files[] + sides[] in the same order.
   * No upload percentage: requests go through CapacitorHttp (Phase 5), which doesn't report
   * upload progress, so the screen shows "uploading…" until the answer arrives.
   */
  async upload(requirementId: number, files: UploadFile[], fields: DocumentFields = {}): Promise<DriverDocument> {
    const form = new FormData();
    form.append('requirement_id', String(requirementId));
    for (const file of files) {
      form.append('files[]', file.blob, file.filename);
      form.append('sides[]', file.side);
    }
    for (const [key, value] of Object.entries(fields)) {
      if (value !== null && value !== undefined && value !== '') {
        form.append(key, value);
      }
    }

    const document = await apiCall(
      this.http.post<{ data: DriverDocument }>(`${this.base}/documents`, form).pipe(map((r) => r.data)),
      (k) => this.i18n.t(k),
      UPLOAD_TIMEOUT_MS,
    );
    await this.loadChecklist().catch(() => undefined); // the screen refreshes; a failure here isn't the upload's fault
    return document;
  }

  /** One submission with its review history. */
  async document(id: number): Promise<DriverDocument> {
    return apiCall(
      this.http.get<{ data: DriverDocument }>(`${this.base}/documents/${id}`).pipe(map((r) => r.data)),
      (k) => this.i18n.t(k),
    );
  }

  /** Forget the cached checklist (logout). */
  clear(): void {
    this.current.set(null);
  }
}
