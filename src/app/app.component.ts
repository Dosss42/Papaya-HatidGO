import { Component } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { IonApp, IonRouterOutlet } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { TRICYCLE_ICON } from './shared/icons/tricycle.icon';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  constructor() {
    // The app's authored icons, usable as <ion-icon name="tricycle"> everywhere.
    addIcons({ tricycle: TRICYCLE_ICON });

    // Every screen is white, so the status bar always needs dark icons (Style.Light = dark text
    // for light backgrounds), even when the phone is in dark theme or battery saver.
    if (Capacitor.isNativePlatform()) {
      void StatusBar.setStyle({ style: Style.Light });
    }
  }
}
