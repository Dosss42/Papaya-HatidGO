import { Component } from '@angular/core';
import { IonContent } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { walletOutline } from 'ionicons/icons';
import { TranslatePipe } from '../../../../core/i18n/t.pipe';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';

/** Earnings. Empty state for now; totals come from completed rides (Phase 11). */
@Component({
  selector: 'app-driver-earnings',
  templateUrl: './driver-earnings.page.html',
  styleUrls: ['./driver-earnings.page.scss'],
  imports: [IonContent, EmptyStateComponent, TranslatePipe],
})
export class DriverEarningsPage {
  constructor() {
    addIcons({ walletOutline });
  }
}
