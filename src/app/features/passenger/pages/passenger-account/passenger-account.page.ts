import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonButton, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-passenger-account',
  templateUrl: './passenger-account.page.html',
  styleUrls: ['./passenger-account.page.scss'],
  imports: [IonButton, IonContent, IonHeader, IonTitle, IonToolbar],
})
export class PassengerAccountPage {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/auth/welcome', { replaceUrl: true });
  }
}
