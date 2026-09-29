import { Component } from '@angular/core';
import { IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { homeOutline, timeOutline, walletOutline, personCircleOutline } from 'ionicons/icons';

@Component({
  selector: 'app-driver-tabs',
  templateUrl: './driver-tabs.page.html',
  styleUrls: ['./driver-tabs.page.scss'],
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
})
export class DriverTabsPage {
  constructor() {
    addIcons({ homeOutline, timeOutline, walletOutline, personCircleOutline });
  }
}
