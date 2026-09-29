import { Component } from '@angular/core';
import { IonContent } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { receiptOutline } from 'ionicons/icons';
import { TranslatePipe } from '../../../../core/i18n/t.pipe';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';

/** Ride history. Empty state for now; the list arrives with rides (Phase 10). */
@Component({
  selector: 'app-passenger-rides',
  templateUrl: './passenger-rides.page.html',
  styleUrls: ['./passenger-rides.page.scss'],
  imports: [IonContent, EmptyStateComponent, TranslatePipe],
})
export class PassengerRidesPage {
  constructor() {
    addIcons({ receiptOutline });
  }
}
