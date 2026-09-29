import { Component, computed, inject } from '@angular/core';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';
import { AuthService } from '../../../../core/services/auth.service';
import { OfflineNoticeComponent } from '../../../../shared/components/offline-notice/offline-notice.component';

/** Placeholder home (the real screen comes later). Shows the saved name, also offline (Phase 6). */
@Component({
  selector: 'app-driver-home',
  templateUrl: './driver-home.page.html',
  styleUrls: ['./driver-home.page.scss'],
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, OfflineNoticeComponent],
})
export class DriverHomePage {
  private readonly auth = inject(AuthService);
  protected readonly firstName = computed(() => this.auth.currentUser()?.first_name ?? '');
}
