import { Component, computed, input } from '@angular/core';
import { MessageKey } from '../../../core/i18n/messages.en';
import { TranslatePipe } from '../../../core/i18n/t.pipe';
import { User } from '../../models/user.model';
import { formatPhoneLocal } from '../../utilities/phone';

/** Account header: initials, name, role, phone (as written locally) and email. Read-only. */
@Component({
  selector: 'app-profile-card',
  imports: [TranslatePipe],
  template: `
    @if (user(); as u) {
      <section class="hg-profile" [attr.aria-label]="'account.aria' | t">
        <div class="hg-profile__avatar" aria-hidden="true">{{ initials() }}</div>
        <div>
          <p class="hg-profile__name">{{ u.full_name }}</p>
          <p class="hg-profile__meta">{{ roleKey() | t }} · {{ phone() }}</p>
          <p class="hg-profile__meta">{{ u.email }}</p>
        </div>
      </section>
    }
  `,
})
export class ProfileCardComponent {
  readonly user = input<User | null>(null);

  protected readonly initials = computed(() => {
    const u = this.user();
    return u ? `${u.first_name.charAt(0)}${u.last_name.charAt(0)}`.toUpperCase() : '';
  });
  protected readonly roleKey = computed<MessageKey>(() => (this.user()?.role === 'driver' ? 'role.driver' : 'role.passenger'));
  protected readonly phone = computed(() => formatPhoneLocal(this.user()?.phone));
}
