import { Component } from '@angular/core';
import { IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { TranslatePipe } from '../../../../core/i18n/t.pipe';
import { personCircleOutline, receiptOutline } from 'ionicons/icons';

/** Passenger area: Mag-book · Biyahe · Account. "tricycle" is registered app-wide (app.component.ts). */
@Component({
  selector: 'app-passenger-tabs',
  templateUrl: './passenger-tabs.page.html',
  styleUrls: ['./passenger-tabs.page.scss'],
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, TranslatePipe],
})
export class PassengerTabsPage {
  constructor() {
    // Register only the icons this page uses, so unused icons are not bundled.
    addIcons({ receiptOutline, personCircleOutline });
  }
}
