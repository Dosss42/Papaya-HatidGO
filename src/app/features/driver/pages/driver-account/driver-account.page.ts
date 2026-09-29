import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IonButton, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';
import { AuthService } from '../../../../core/services/auth.service';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-driver-account',
  templateUrl: './driver-account.page.html',
  styleUrls: ['./driver-account.page.scss'],
  imports: [IonButton, IonContent, IonHeader, IonTitle, IonToolbar, RouterLink],
})
export class DriverAccountPage {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  // Shows the dev-only diagnostics link; false in production builds.
  protected readonly isDev = !environment.production;

  async logout(): Promise<void> {
    await this.auth.logout(); // revokes the token on the server, then forgets it on the phone
    await this.router.navigateByUrl(this.auth.guestStartUrl(), { replaceUrl: true }); // Login: this phone was used before
  }
}
