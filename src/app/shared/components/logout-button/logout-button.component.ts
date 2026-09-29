import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, IonSpinner } from '@ionic/angular';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../core/i18n/t.pipe';
import { AuthService } from '../../../core/services/auth.service';

/**
 * Logout, asked first: an older driver's thumb can hit it by accident, and logging back in
 * costs them a password. Outline style: logging out is never the screen's main action.
 */
@Component({
  selector: 'app-logout-button',
  imports: [IonSpinner, TranslatePipe],
  template: `
    <button class="hg-button hg-button--outline" type="button" [disabled]="busy()" (click)="confirm()">
      @if (busy()) {
        <ion-spinner name="crescent" aria-hidden="true" /> {{ 'logout.busy' | t }}
      } @else {
        {{ 'logout.button' | t }}
      }
    </button>
  `,
})
export class LogoutButtonComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly alerts = inject(AlertController);
  private readonly i18n = inject(I18nService);
  protected readonly busy = signal(false);

  protected async confirm(): Promise<void> {
    const alert = await this.alerts.create({
      header: this.i18n.t('logout.confirmTitle'),
      message: this.i18n.t('logout.confirmText'),
      buttons: [
        { text: this.i18n.t('logout.cancel'), role: 'cancel' },
        { text: this.i18n.t('logout.confirm'), role: 'confirm' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    if (role !== 'confirm') {
      return;
    }

    this.busy.set(true);
    try {
      await this.auth.logout(); // revokes the token on the server, then forgets it on the phone
      await this.router.navigateByUrl(this.auth.guestStartUrl(), { replaceUrl: true });
    } finally {
      this.busy.set(false);
    }
  }
}
