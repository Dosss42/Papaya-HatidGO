import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { cardOutline, helpCircleOutline } from 'ionicons/icons';
import { AuthService } from '../../../../core/services/auth.service';
import { TranslatePipe } from '../../../../core/i18n/t.pipe';
import { LanguageRowComponent } from '../../../../shared/components/language-row/language-row.component';
import { LogoutButtonComponent } from '../../../../shared/components/logout-button/logout-button.component';
import { ProfileCardComponent } from '../../../../shared/components/profile-card/profile-card.component';
import { SubscriptionRowComponent } from '../../../../shared/components/subscription-row/subscription-row.component';
import { environment } from '../../../../../environments/environment';

/** Passenger account: profile, settings rows (marked "Darating" until their phase), logout. */
@Component({
  selector: 'app-passenger-account',
  templateUrl: './passenger-account.page.html',
  styleUrls: ['./passenger-account.page.scss'],
  imports: [IonContent, IonIcon, RouterLink, ProfileCardComponent, LogoutButtonComponent, LanguageRowComponent, SubscriptionRowComponent, TranslatePipe],
})
export class PassengerAccountPage {
  protected readonly auth = inject(AuthService);
  // Shows the dev-only diagnostics link; false in production builds.
  protected readonly isDev = !environment.production;

  constructor() {
    addIcons({ cardOutline, helpCircleOutline });
  }
}
