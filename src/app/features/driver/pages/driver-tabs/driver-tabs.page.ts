import { Component, inject } from '@angular/core';
import { IonBadge, IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { TranslatePipe } from '../../../../core/i18n/t.pipe';
import { homeOutline, notificationsOutline, personCircleOutline, receiptOutline, walletOutline } from 'ionicons/icons';
import { NotificationsService } from '../../../../core/services/notifications.service';
import { badgeText } from '../../../notifications/alert-view';
import { PushPromptComponent } from '../../../notifications/push-prompt.component';
import { RequestAlertComponent } from '../../components/request-alert/request-alert.component';

/** Driver area: Home · Biyahe · Kita · Abiso · Account, plus the incoming-request takeover over all of them. */
@Component({
  selector: 'app-driver-tabs',
  templateUrl: './driver-tabs.page.html',
  styleUrls: ['./driver-tabs.page.scss'],
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonBadge, TranslatePipe, RequestAlertComponent, PushPromptComponent],
})
export class DriverTabsPage {
  protected readonly notifications = inject(NotificationsService);
  protected readonly badge = badgeText;

  constructor() {
    addIcons({ homeOutline, receiptOutline, walletOutline, notificationsOutline, personCircleOutline });
  }
}
