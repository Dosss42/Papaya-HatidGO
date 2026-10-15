import { Component } from '@angular/core';
import { IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { TranslatePipe } from '../../../../core/i18n/t.pipe';
import { homeOutline, personCircleOutline, receiptOutline, walletOutline } from 'ionicons/icons';
import { RequestAlertComponent } from '../../components/request-alert/request-alert.component';

/** Driver area: Home · Biyahe · Kita · Account, plus the incoming-request takeover over all of them. */
@Component({
  selector: 'app-driver-tabs',
  templateUrl: './driver-tabs.page.html',
  styleUrls: ['./driver-tabs.page.scss'],
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, TranslatePipe, RequestAlertComponent],
})
export class DriverTabsPage {
  constructor() {
    addIcons({ homeOutline, receiptOutline, walletOutline, personCircleOutline });
  }
}
