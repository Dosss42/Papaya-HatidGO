import { Component, inject, input } from '@angular/core';
import { IonIcon, IonModal } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { notificationsOutline } from 'ionicons/icons';
import { TranslatePipe } from '../../core/i18n/t.pipe';
import { NotificationsService } from '../../core/services/notifications.service';

/**
 * Before Android's own "Allow notifications?" (Android 13+), once per phone, right after login
 * (Phase 13 decision #7): say what the person gets from it, in their role's words. "Not now"
 * loses nothing; the Alerts card offers it again.
 */
@Component({
  selector: 'app-push-prompt',
  imports: [IonModal, IonIcon, TranslatePipe],
  template: `
    <ion-modal [isOpen]="notifications.askNow()" [initialBreakpoint]="1" [breakpoints]="[0, 1]" (didDismiss)="dismissed($event)" class="push-prompt-modal">
      <ng-template>
        <div class="hg-column push-prompt">
          <div class="push-prompt__icon"><ion-icon name="notifications-outline" aria-hidden="true" /></div>
          <h2 class="push-prompt__title">{{ (role() === 'driver' ? 'push.titleDriver' : 'push.titlePassenger') | t }}</h2>
          <p class="push-prompt__body">{{ (role() === 'driver' ? 'push.bodyDriver' : 'push.bodyPassenger') | t }}</p>
          <button class="hg-button hg-button--primary" type="button" (click)="notifications.allow()">{{ 'push.allow' | t }}</button>
          <button class="hg-button hg-button--text" type="button" (click)="notifications.later()">{{ 'push.later' | t }}</button>
        </div>
      </ng-template>
    </ion-modal>
  `,
  styles: `
    ion-modal.push-prompt-modal {
      --height: auto;
      --border-radius: 16px;
    }
    .push-prompt {
      padding: 28px 16px calc(env(safe-area-inset-bottom) + 12px);
      text-align: center;
    }
    .push-prompt__icon {
      display: grid;
      place-items: center;
      width: 72px;
      height: 72px;
      margin: 0 auto 16px;
      border-radius: 50%;
      background: var(--hg-orange-tint);
      color: var(--hg-orange);
      font-size: 36px;
    }
    .push-prompt__title {
      margin: 0 0 8px;
      font-size: 1.4rem;
      font-weight: 800;
      line-height: 1.2;
      text-wrap: balance;
    }
    .push-prompt__body {
      margin: 0 0 24px;
      color: var(--hg-ink-soft);
      line-height: 1.45;
    }
  `,
})
export class PushPromptComponent {
  readonly role = input.required<'passenger' | 'driver'>();
  protected readonly notifications = inject(NotificationsService);

  constructor() {
    addIcons({ notificationsOutline });
  }

  /**
   * Swiped down or tapped outside = "Not now". Any other close (the page being rebuilt while
   * logging in, found on the emulator) is NOT an answer: the sheet comes back.
   */
  protected dismissed(event: Event): void {
    const role = (event as CustomEvent<{ role?: string }>).detail?.role;
    if (this.notifications.askNow() && (role === 'backdrop' || role === 'gesture')) void this.notifications.later();
  }
}
