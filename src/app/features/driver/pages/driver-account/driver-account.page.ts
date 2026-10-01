import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { cardOutline, chevronForward, documentTextOutline, helpCircleOutline } from 'ionicons/icons';
import { AuthService } from '../../../../core/services/auth.service';
import { TranslatePipe } from '../../../../core/i18n/t.pipe';
import { LanguageRowComponent } from '../../../../shared/components/language-row/language-row.component';
import { LogoutButtonComponent } from '../../../../shared/components/logout-button/logout-button.component';
import { ProfileCardComponent } from '../../../../shared/components/profile-card/profile-card.component';
import { SubscriptionRowComponent } from '../../../../shared/components/subscription-row/subscription-row.component';
import { environment } from '../../../../../environments/environment';

/** Driver account: profile, settings rows (tricycle + documents become real in Phase 7, subscription in Phase 8), logout. */
@Component({
  selector: 'app-driver-account',
  templateUrl: './driver-account.page.html',
  styleUrls: ['./driver-account.page.scss'],
  imports: [IonContent, IonIcon, RouterLink, ProfileCardComponent, LogoutButtonComponent, LanguageRowComponent, SubscriptionRowComponent, TranslatePipe],
})
export class DriverAccountPage {
  protected readonly auth = inject(AuthService);
  // Shows the dev-only diagnostics link; false in production builds.
  protected readonly isDev = !environment.production;

  constructor() {
    addIcons({ cardOutline, chevronForward, documentTextOutline, helpCircleOutline });
  }
}
