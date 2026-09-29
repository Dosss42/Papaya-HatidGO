import { Component } from '@angular/core';
import { IonContent, IonIcon, IonInput } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { constructOutline, location } from 'ionicons/icons';
import { TranslatePipe } from '../../../../core/i18n/t.pipe';
import { OfflineNoticeComponent } from '../../../../shared/components/offline-notice/offline-notice.component';

/**
 * PREVIEW of booking step 1 (design-briefs/passenger-booking.md § 4), laid out in the DESIGN.md
 * look. Nothing here works yet: the map and booking arrive in Phase 10.
 */
@Component({
  selector: 'app-passenger-book',
  templateUrl: './passenger-book.page.html',
  styleUrls: ['./passenger-book.page.scss'],
  imports: [IonContent, IonIcon, IonInput, OfflineNoticeComponent, TranslatePipe],
})
export class PassengerBookPage {
  constructor() {
    addIcons({ location, constructOutline });
  }
}
