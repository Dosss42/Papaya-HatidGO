import { Component } from '@angular/core';
import { IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { carOutline, timeOutline, personCircleOutline } from 'ionicons/icons';

@Component({
  selector: 'app-passenger-tabs',
  templateUrl: './passenger-tabs.page.html',
  styleUrls: ['./passenger-tabs.page.scss'],
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
})
export class PassengerTabsPage {
  constructor() {
    // Register only the icons this page uses, so unused icons are not bundled.
    addIcons({ carOutline, timeOutline, personCircleOutline });
  }
}
