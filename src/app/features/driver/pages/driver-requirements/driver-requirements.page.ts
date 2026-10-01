import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonBackButton, IonButtons, IonContent, IonHeader, IonIcon, IonRefresher, IonRefresherContent, IonSpinner, IonToolbar, ViewWillEnter } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { alertCircle, chevronForward } from 'ionicons/icons';
import { TranslatePipe } from '../../../../core/i18n/t.pipe';
import { DriverDocumentsService } from '../../../../core/services/driver-documents.service';
import { StatusChipComponent } from '../../../../shared/components/status-chip/status-chip.component';
import { ApiError } from '../../../../shared/utilities/api-error';
import { sortForList } from '../../requirement-view';

/**
 * Requirements list (brief § 4.1): one row per requirement, name · chip · one-line detail,
 * needs-action first so it reads as a to-do list. Tap → the requirement's screen
 * (a locked tricycle paper → the tricycle form instead).
 */
@Component({
  selector: 'app-driver-requirements',
  templateUrl: './driver-requirements.page.html',
  styleUrls: ['./driver-requirements.page.scss'],
  imports: [
    IonBackButton, IonButtons, IonContent, IonHeader, IonIcon, IonRefresher, IonRefresherContent, IonSpinner, IonToolbar,
    RouterLink, StatusChipComponent, TranslatePipe,
  ],
})
export class DriverRequirementsPage implements ViewWillEnter {
  protected readonly docs = inject(DriverDocumentsService);
  private readonly dates = new DatePipe('en-US');

  protected readonly loading = signal(false);
  protected readonly error = signal<ApiError | null>(null);

  protected readonly rows = computed(() => {
    const checklist = this.docs.checklist();
    return checklist ? sortForList(checklist.requirements, (iso) => this.dates.transform(iso, 'MMM d, y') ?? iso) : [];
  });

  constructor() {
    addIcons({ alertCircle, chevronForward });
  }

  /** Every time the screen opens (also when coming back from an upload): fresh from the server. */
  ionViewWillEnter(): void {
    void this.load();
  }

  protected async load(event?: CustomEvent): Promise<void> {
    this.loading.set(!this.docs.checklist());
    this.error.set(null);
    try {
      await this.docs.loadChecklist();
    } catch (err) {
      this.error.set(err as ApiError);
    } finally {
      this.loading.set(false);
      (event?.target as HTMLIonRefresherElement | undefined)?.complete();
    }
  }
}
