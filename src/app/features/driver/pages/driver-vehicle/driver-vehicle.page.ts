import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonBackButton, IonButtons, IonContent, IonHeader, IonIcon, IonInput, IonSpinner, IonToolbar, ViewWillEnter } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { alertCircle, checkmarkCircle, informationCircleOutline } from 'ionicons/icons';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { MessageKey } from '../../../../core/i18n/messages.en';
import { TranslatePipe } from '../../../../core/i18n/t.pipe';
import { DriverDocumentsService } from '../../../../core/services/driver-documents.service';
import { VehicleService } from '../../../../core/services/vehicle.service';
import { StatusChipComponent } from '../../../../shared/components/status-chip/status-chip.component';
import { Vehicle, VehiclePayload } from '../../../../shared/models/driver.model';
import { ApiError } from '../../../../shared/utilities/api-error';
import { clientError } from '../../../../shared/utilities/form-errors';
import { ChipKind } from '../../requirement-view';

type Field = 'plate_number' | 'body_number' | 'color' | 'make' | 'model';

/** The same "one stored form" rule as the API (PlateNumber): "abc-1234" and "ABC1234" are one plate. */
const samePlate = (a: string, b: string) => a.replace(/[\s-]+/g, '').toUpperCase() === b.replace(/[\s-]+/g, '').toUpperCase();

/**
 * The tricycle form (brief § 4.3): plate number · body number · color · brand / model, and the
 * status chip. Editing the plate of an existing tricycle shows the consequence BEFORE saving:
 * it will be reviewed again (the API voids its OR/CR and MTOP, step 7.2).
 */
@Component({
  selector: 'app-driver-vehicle',
  templateUrl: './driver-vehicle.page.html',
  styleUrls: ['./driver-vehicle.page.scss'],
  imports: [
    IonBackButton, IonButtons, IonContent, IonHeader, IonIcon, IonInput, IonSpinner, IonToolbar,
    ReactiveFormsModule, RouterLink, StatusChipComponent, TranslatePipe,
  ],
})
export class DriverVehiclePage implements ViewWillEnter {
  private readonly vehicles = inject(VehicleService);
  private readonly docs = inject(DriverDocumentsService);
  private readonly i18n = inject(I18nService);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    plate_number: ['', Validators.required],
    body_number: [''],
    color: ['', Validators.required],
    make: [''],
    model: [''],
  });

  protected readonly tricycle = computed(() => this.vehicles.active());
  protected readonly saving = signal(false);
  protected readonly error = signal<ApiError | null>(null);
  protected readonly done = signal<'added' | 'saved' | null>(null);
  protected readonly loadFailed = signal(false);

  private readonly plate = toSignal(this.form.controls.plate_number.valueChanges, { initialValue: '' });
  /** True while the typed plate differs from the saved one (the warning shows before saving). */
  protected readonly plateChanged = computed(() => {
    const saved = this.tricycle();
    const typed = this.plate();
    return saved !== null && typed.trim() !== '' && !samePlate(typed, saved.plate_number);
  });

  protected readonly statusChip = computed<{ kind: ChipKind; key: MessageKey; icon: string } | null>(() => {
    switch (this.tricycle()?.status) {
      case 'verified':
        return { kind: 'ok', key: 'veh.status.verified', icon: 'checkmark-circle' };
      case 'pending':
        return { kind: 'wait', key: 'veh.status.pending', icon: 'time-outline' };
      case 'rejected':
        return { kind: 'fix', key: 'veh.status.rejected', icon: 'close-circle' };
      case 'inactive':
        return { kind: 'locked', key: 'veh.status.inactive', icon: 'lock-closed-outline' };
      default:
        return null;
    }
  });

  private readonly labels: Record<Field, MessageKey> = {
    plate_number: 'label.plate',
    body_number: 'veh.body',
    color: 'label.color',
    make: 'veh.make',
    model: 'veh.model',
  };

  constructor() {
    addIcons({ alertCircle, checkmarkCircle, informationCircleOutline });
  }

  ionViewWillEnter(): void {
    this.done.set(null);
    void this.load();
  }

  protected fieldError(name: Field): string | null {
    const t = this.i18n.t.bind(this.i18n);
    return clientError(this.form.controls[name], this.labels[name], t) ?? this.error()?.fieldErrors[name] ?? null;
  }

  protected async save(): Promise<void> {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.done.set(null);
    try {
      const existing = this.tricycle();
      const value = this.form.getRawValue();
      if (existing) {
        await this.vehicles.update(existing.id, this.changes(existing, value));
        this.done.set('saved');
      } else {
        await this.vehicles.create(this.payload(value));
        this.done.set('added');
      }
      this.fill(this.tricycle());
      await this.docs.loadChecklist().catch(() => undefined); // Home and the list show the new state
    } catch (err) {
      this.error.set(err as ApiError);
    } finally {
      this.saving.set(false);
    }
  }

  private async load(): Promise<void> {
    this.loadFailed.set(false);
    try {
      await this.vehicles.load();
      this.fill(this.tricycle());
    } catch {
      this.loadFailed.set(true);
    }
  }

  private fill(vehicle: Vehicle | null): void {
    this.form.reset({
      plate_number: vehicle?.plate_number ?? '',
      body_number: vehicle?.body_number ?? '',
      color: vehicle?.color ?? '',
      make: vehicle?.make ?? '',
      model: vehicle?.model ?? '',
    });
  }

  private payload(value: ReturnType<typeof this.form.getRawValue>): VehiclePayload {
    return {
      plate_number: value.plate_number,
      color: value.color,
      body_number: value.body_number || null,
      make: value.make || null,
      model: value.model || null,
    };
  }

  /** Only what changed is sent (so an unchanged plate is never "changed" by formatting). */
  private changes(saved: Vehicle, value: ReturnType<typeof this.form.getRawValue>): VehiclePayload {
    const next = this.payload(value);
    const out: VehiclePayload = {};
    if (!samePlate(value.plate_number, saved.plate_number)) out.plate_number = next.plate_number;
    if ((next.body_number ?? null) !== (saved.body_number ?? null)) out.body_number = next.body_number;
    if (next.color !== saved.color) out.color = next.color;
    if ((next.make ?? null) !== (saved.make ?? null)) out.make = next.make;
    if ((next.model ?? null) !== (saved.model ?? null)) out.model = next.model;
    return out;
  }
}
