import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { IonIcon, IonSpinner } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { cloudOfflineOutline } from 'ionicons/icons';
import { AuthService } from '../../../core/services/auth.service';

/**
 * Shown while the app runs on the saved copy of the user (the API could not be reached at startup):
 * "Walang internet · huling update 2:15 PM" + "Subukan ulit". Hidden the rest of the time.
 */
@Component({
  selector: 'app-offline-notice',
  imports: [DatePipe, IonIcon, IonSpinner],
  template: `
    @if (auth.isOffline()) {
      <div class="hg-notice hg-notice--offline" role="status">
        <ion-icon name="cloud-offline-outline" aria-hidden="true" />
        <div class="offline__body">
          <strong>Walang internet</strong>
          @if (auth.lastSynced(); as at) {
            <span>Huling update {{ at | date: (isToday() ? 'h:mm a' : 'MMM d, h:mm a') }}</span>
          }
          <button class="hg-button hg-button--outline offline__retry" type="button" [disabled]="retrying()" (click)="retry()">
            @if (retrying()) {
              <ion-spinner name="crescent" aria-hidden="true" /> Sinusubukan…
            } @else {
              Subukan ulit
            }
          </button>
        </div>
      </div>
    }
  `,
  styles: `
    .hg-notice--offline {
      background: var(--hg-surface);
      color: var(--hg-ink);
      box-shadow: inset 0 0 0 2px var(--hg-field-line);
    }
    .offline__body {
      display: grid;
      gap: 4px;
      flex: 1;
    }
    .offline__body span {
      color: var(--hg-ink-soft);
    }
    .offline__retry {
      margin-top: 10px;
      min-height: 56px;
    }
  `,
})
export class OfflineNoticeComponent {
  protected readonly auth = inject(AuthService);
  protected readonly retrying = signal(false);

  protected readonly isToday = computed(() => {
    const at = this.auth.lastSynced();
    return at !== null && at.toDateString() === new Date().toDateString();
  });

  constructor() {
    addIcons({ cloudOfflineOutline });
  }

  protected async retry(): Promise<void> {
    this.retrying.set(true);
    try {
      await this.auth.refreshSession();
    } finally {
      this.retrying.set(false);
    }
  }
}
