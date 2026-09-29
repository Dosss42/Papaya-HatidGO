import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { environment } from '../../../../../environments/environment';
import { BrandLogoComponent } from '../../../../shared/components/brand-logo/brand-logo.component';

/**
 * Get Started: the logo and name, then "Magsimula" (register, where the role is chosen)
 * or "May account na ako" (login). Direction contract: .impeccable/surfaces/src-app-features-auth.md
 */
@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.page.html',
  styleUrls: ['./welcome.page.scss'],
  imports: [IonContent, RouterLink, BrandLogoComponent],
})
export class WelcomePage {
  // Shows the dev-only diagnostics link; false in production builds.
  protected readonly isDev = !environment.production;
}
