import { Component, inject } from '@angular/core';
import { IonBadge, IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { TranslatePipe } from '../../../../core/i18n/t.pipe';
import { notificationsOutline, personCircleOutline, receiptOutline } from 'ionicons/icons';
import { NotificationsService } from '../../../../core/services/notifications.service';
import { badgeText } from '../../../notifications/alert-view';
import { PushPromptComponent } from '../../../notifications/push-prompt.component';

/** Passenger area: Mag-book · Biyahe · Abiso · Account. "tricycle" is registered app-wide (app.component.ts). */
@Component({
  selector: 'app-passenger-tabs',
  templateUrl: './passenger-tabs.page.html',
  styleUrls: ['./passenger-tabs.page.scss'],
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonBadge, TranslatePipe, PushPromptComponent],
})
export class PassengerTabsPage {
  protected readonly notifications = inject(NotificationsService);
  protected readonly badge = badgeText;

  constructor() {
    // Register only the icons this page uses, so unused icons are not bundled.
    addIcons({ receiptOutline, notificationsOutline, personCircleOutline });
  }
}
