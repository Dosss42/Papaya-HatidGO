import { Component } from '@angular/core';
import { IonContent } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { receiptOutline } from 'ionicons/icons';
import { TranslatePipe } from '../../../../core/i18n/t.pipe';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';

/** Trip history. Empty state for now; the list arrives with driver rides (Phase 11). */
@Component({
  selector: 'app-driver-rides',
  templateUrl: './driver-rides.page.html',
  styleUrls: ['./driver-rides.page.scss'],
  imports: [IonContent, EmptyStateComponent, TranslatePipe],
})
export class DriverRidesPage {
  constructor() {
    addIcons({ receiptOutline });
  }
}
