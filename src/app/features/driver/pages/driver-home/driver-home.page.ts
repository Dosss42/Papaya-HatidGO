import { Component, computed, inject } from '@angular/core';
import { IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { constructOutline, lockClosedOutline } from 'ionicons/icons';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { MessageKey } from '../../../../core/i18n/messages.en';
import { TranslatePipe } from '../../../../core/i18n/t.pipe';
import { AuthService } from '../../../../core/services/auth.service';
import { OfflineNoticeComponent } from '../../../../shared/components/offline-notice/offline-notice.component';

/** Headline per compliance status (design-briefs/driver-requirements.md § 6). */
const HEADLINES: Record<string, MessageKey> = {
  pending_verification: 'home.head.pending_verification',
  under_review: 'home.head.under_review',
  rejected: 'home.head.rejected',
  expired: 'home.head.expired',
  verified: 'home.head.verified',
};

/** The primary button for each status (brief § 6). Under review: nothing to press, just wait. */
const NEXT_STEPS: Record<string, MessageKey | null> = {
  under_review: null,
  rejected: 'home.next.rejected',
  expired: 'home.next.expired',
  verified: 'home.next.verified',
};

/**
 * PREVIEW of the Driver Home checklist (design-briefs/driver-requirements.md § 3). The headline
 * and the button are REAL (the driver's compliance status from /auth/me); the checklist rows
 * become real in Phase 7 step 7.8, subscription in Phase 8, going online in Phase 11.
 */
@Component({
  selector: 'app-driver-home',
  templateUrl: './driver-home.page.html',
  styleUrls: ['./driver-home.page.scss'],
  imports: [IonContent, IonIcon, OfflineNoticeComponent, TranslatePipe],
})
export class DriverHomePage {
  private readonly auth = inject(AuthService);
  private readonly i18n = inject(I18nService);

  protected readonly firstName = computed(() => this.auth.currentUser()?.first_name ?? '');
  private readonly status = computed(() => this.auth.session()?.driver?.compliance_status ?? '');

  /** Words kept whole, so "Mag-subscribe" never breaks at its hyphen (DESIGN.md). */
  protected readonly headlineWords = computed(() =>
    this.i18n.t(HEADLINES[this.status()] ?? 'home.head.default').split(' '),
  );
  /** The one next step, matching the headline. Null = nothing to do but wait. */
  protected readonly nextStep = computed<MessageKey | null>(() =>
    this.status() in NEXT_STEPS ? NEXT_STEPS[this.status()] : 'home.next.default',
  );

  protected readonly checklist: { title: MessageKey; detail: MessageKey; locked: boolean }[] = [
    { title: 'home.check.tricycle', detail: 'home.check.tricycleDetail', locked: false },
    { title: 'home.check.documents', detail: 'home.check.documentsDetail', locked: false },
    { title: 'home.check.subscription', detail: 'home.check.subscriptionDetail', locked: false },
    { title: 'home.check.online', detail: 'home.check.onlineDetail', locked: true },
  ];

  constructor() {
    addIcons({ constructOutline, lockClosedOutline });
  }
}
