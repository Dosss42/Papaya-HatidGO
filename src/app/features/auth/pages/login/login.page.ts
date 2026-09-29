import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonButton, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  imports: [IonButton, IonContent, IonHeader, IonTitle, IonToolbar],
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  // TEMPORARY: removed in Phase 5 together with fakeLogin().
  loginAs(role: 'passenger' | 'driver'): void {
    this.auth.fakeLogin(role);
    this.router.navigateByUrl(this.auth.homeUrlFor(role)!, { replaceUrl: true });
  }
}
