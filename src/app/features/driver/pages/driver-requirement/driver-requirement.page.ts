import { DatePipe } from '@angular/common';
import { Component, OnDestroy, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonBackButton, IonButtons, IonContent, IonHeader, IonIcon, IonSpinner, IonToolbar, ViewWillEnter } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { alertCircle, calendarOutline, checkmarkCircle, chevronDown, chevronUp, cropOutline, eyeOutline, lockClosedOutline, sunnyOutline, textOutline } from 'ionicons/icons';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { MessageKey } from '../../../../core/i18n/messages.en';
import { TranslatePipe } from '../../../../core/i18n/t.pipe';
import { DriverDocumentsService } from '../../../../core/services/driver-documents.service';
import { CapturedFile, PhotoService } from '../../../../core/services/photo.service';
import { PhotoSlotComponent } from '../../../../shared/components/photo-slot/photo-slot.component';
import { StatusChipComponent } from '../../../../shared/components/status-chip/status-chip.component';
import { DocumentSide, DriverDocument, UploadFile } from '../../../../shared/models/driver.model';
import { ApiError } from '../../../../shared/utilities/api-error';
import { requirementView } from '../../requirement-view';

/** Tomorrow on the phone's calendar: the earliest expiry date the API accepts. */
function tomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * One requirement: what's needed · the status (and the admin's reason, highlighted) · photo
 * guide · Harap/Likod slots with preview + Ulitin · expiry date · privacy line · Isumite ·
 * earlier submissions (brief § 4.2). Route: /driver/requirements/:code (e.g. drivers_license).
 */
@Component({
  selector: 'app-driver-requirement',
  templateUrl: './driver-requirement.page.html',
  styleUrls: ['./driver-requirement.page.scss'],
  imports: [
    IonBackButton, IonButtons, IonContent, IonHeader, IonIcon, IonSpinner, IonToolbar,
    FormsModule, RouterLink, PhotoSlotComponent, StatusChipComponent, TranslatePipe,
  ],
})
export class DriverRequirementPage implements ViewWillEnter, OnDestroy {
  private readonly docs = inject(DriverDocumentsService);
  private readonly photos = inject(PhotoService);
  private readonly i18n = inject(I18nService);
  private readonly dates = new DatePipe('en-US');

  /** From the URL (router input binding). */
  readonly code = input.required<string>();

  protected readonly loading = signal(false);
  protected readonly loadFailed = signal(false);

  protected readonly row = computed(() => this.docs.checklist()?.requirements.find((r) => r.requirement.code === this.code()) ?? null);
  protected readonly view = computed(() => {
    const row = this.row();
    return row ? requirementView(row, (iso) => this.formatDate(iso)) : null;
  });

  /** The photo slots this requirement needs: the license has two sides. */
  protected readonly sides = computed<DocumentSide[]>(() => (this.row()?.requirement.max_files === 2 ? ['front', 'back'] : ['page']));
  protected readonly files = signal<Record<DocumentSide, CapturedFile | null>>({ front: null, back: null, page: null });

  protected readonly expiry = signal('');
  protected get expiresAt(): string {
    return this.expiry();
  }
  protected set expiresAt(value: string) {
    this.expiry.set(value ?? '');
  }
  protected documentNumber = '';
  protected readonly minDate = tomorrow();

  protected readonly renewing = signal(false);
  protected readonly submitting = signal(false);
  protected readonly submitted = signal(false);
  protected readonly error = signal<ApiError | null>(null);

  protected readonly historyOpen = signal(false);
  protected readonly history = signal<DriverDocument['reviews'] | null>(null);

  /** Show the capture form? Not while approved (unless renewing) and not when locked. */
  protected readonly canUpload = computed(() => {
    const row = this.row();
    if (!row || row.locked || this.submitted()) {
      return false;
    }
    return row.status !== 'approved' || this.renewing();
  });

  /** Uploading now replaces an earlier upload nobody has reviewed yet (API rule, step 7.3). */
  protected readonly replacesPending = computed(() => {
    const row = this.row();
    return !!row && (row.status === 'pending' || row.renewal !== null);
  });

  protected readonly ready = computed(() => this.sides().every((side) => this.files()[side] !== null));

  /** What still blocks Isumite, in words ("litrato ng Likod, expiry date"); null when nothing does. */
  protected readonly stillMissing = computed(() => {
    const row = this.row();
    if (!row) return null;
    const items = this.sides()
      .filter((side) => this.files()[side] === null)
      .map((side) =>
        side === 'page'
          ? this.i18n.t('req.missing.photo')
          : this.i18n.t('req.missing.photoSide', { side: this.i18n.t(this.sideLabel(side)) }),
      );
    if (row.requirement.requires_expiry && !this.expiry()) {
      items.push(this.i18n.t('req.missing.expiry'));
    }
    return items.length ? items.join(', ') : null;
  });

  constructor() {
    addIcons({ alertCircle, calendarOutline, checkmarkCircle, chevronDown, chevronUp, cropOutline, eyeOutline, lockClosedOutline, sunnyOutline, textOutline });
  }

  ionViewWillEnter(): void {
    this.submitted.set(false);
    this.renewing.set(false);
    this.history.set(null);
    this.historyOpen.set(false);
    void this.load();
  }

  ngOnDestroy(): void {
    this.clearFiles(); // ID photos never outlive the screen
  }

  protected sideLabel(side: DocumentSide): MessageKey {
    return side === 'front' ? 'req.side.front' : side === 'back' ? 'req.side.back' : 'req.side.page';
  }

  protected setFile(side: DocumentSide, file: CapturedFile | null): void {
    this.files.update((all) => ({ ...all, [side]: file }));
  }

  protected async submit(): Promise<void> {
    const row = this.row();
    if (!row || !this.ready() || this.submitting()) {
      return;
    }
    this.submitting.set(true);
    this.error.set(null);
    try {
      const files: UploadFile[] = this.sides().map((side) => {
        const file = this.files()[side]!;
        return { blob: file.blob, filename: file.filename, side };
      });
      await this.docs.upload(row.requirement.id, files, {
        expires_at: row.requirement.requires_expiry ? this.expiresAt : null,
        document_number: this.documentNumber.trim() || null,
      });
      this.clearFiles();
      this.expiresAt = '';
      this.documentNumber = '';
      this.renewing.set(false);
      this.submitted.set(true);
      this.history.set(null);
    } catch (err) {
      this.error.set(err as ApiError); // the photos stay on screen: "Subukan ulit" needs no retake
    } finally {
      this.submitting.set(false);
    }
  }

  /** The most specific message: a file error from the API (files / files.0 / files.1), else the general one. */
  protected uploadErrorText(error: ApiError): string {
    const fileError = ['files', 'files.0', 'files.1'].map((key) => error.fieldErrors[key] as string | undefined).find(Boolean);
    return fileError ?? error.message;
  }

  protected async toggleHistory(): Promise<void> {
    this.historyOpen.update((open) => !open);
    const id = this.row()?.document?.id;
    if (this.historyOpen() && this.history() === null && id) {
      try {
        this.history.set((await this.docs.document(id)).reviews);
      } catch {
        this.history.set([]);
      }
    }
  }

  protected reviewKey(action: string): MessageKey {
    const known: Record<string, MessageKey> = {
      approved: 'review.approved',
      rejected: 'review.rejected',
      resubmission_requested: 'review.resubmission_requested',
      expired_by_system: 'review.expired_by_system',
      invalidated_by_system: 'review.invalidated_by_system',
    };
    return known[action] ?? 'review.rejected';
  }

  protected formatDate(iso: string | null | undefined): string {
    return iso ? (this.dates.transform(iso, 'MMM d, y') ?? iso) : '';
  }

  private async load(): Promise<void> {
    this.loading.set(!this.row());
    this.loadFailed.set(false);
    try {
      await this.docs.loadChecklist();
    } catch {
      this.loadFailed.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  private clearFiles(): void {
    for (const file of Object.values(this.files())) {
      this.photos.release(file);
    }
    this.files.set({ front: null, back: null, page: null });
  }
}
