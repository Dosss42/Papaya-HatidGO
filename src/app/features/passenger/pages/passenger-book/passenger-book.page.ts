import { Component, computed, inject } from '@angular/core';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';
import { AuthService } from '../../../../core/services/auth.service';
import { OfflineNoticeComponent } from '../../../../shared/components/offline-notice/offline-notice.component';

/** Placeholder home (the real screen comes later). Shows the saved name, also offline (Phase 6). */
@Component({
  selector: 'app-passenger-book',
  templateUrl: './passenger-book.page.html',
  styleUrls: ['./passenger-book.page.scss'],
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, OfflineNoticeComponent],
})
export class PassengerBookPage {
  private readonly auth = inject(AuthService);
  protected readonly firstName = computed(() => this.auth.currentUser()?.first_name ?? '');
}
