import { Component, effect, inject, untracked } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { IonApp, IonRouterOutlet } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { AppLifecycleService } from './core/services/app-lifecycle.service';
import { AuthService } from './core/services/auth.service';
import { NetworkService } from './core/services/network.service';
import { NotificationsService } from './core/services/notifications.service';
import { TRICYCLE_ICON } from './shared/icons/tricycle.icon';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  private readonly auth = inject(AuthService);
  private readonly network = inject(NetworkService);
  private readonly lifecycle = inject(AppLifecycleService);
  private readonly notifications = inject(NotificationsService);

  constructor() {
    // The app's authored icons, usable as <ion-icon name="tricycle"> everywhere.
    addIcons({ tricycle: TRICYCLE_ICON });

    // Every screen is white, so the status bar always needs dark icons (Style.Light = dark text
    // for light backgrounds), even when the phone is in dark theme or battery saver.
    if (Capacitor.isNativePlatform()) {
      void StatusBar.setStyle({ style: Style.Light });
    }

    // Leave offline mode by itself: whenever the app is running on the saved user copy and the
    // phone is online and in the foreground, ask the API again. Re-runs when the connection
    // comes back or the user returns to the app (a failed try changes nothing, so no loop).
    effect(() => {
      if (this.auth.isOffline() && this.network.online() && this.lifecycle.isActive()) {
        void this.auth.refreshSession();
      }
    });

    // Notifications (Phase 13): on for a passenger or driver the API has confirmed, off at logout.
    // (While the app runs on the saved user copy, offline, it waits: registering needs the API.)
    effect(() => {
      const role = this.auth.role();
      const confirmed = this.auth.sessionState() === 'authenticated';
      untracked(() => {
        if (confirmed && (role === 'passenger' || role === 'driver')) void this.notifications.start(role);
        else if (role === null) this.notifications.stop();
      });
    });
  }
}
