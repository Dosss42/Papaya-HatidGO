import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { languageOutline } from 'ionicons/icons';
import { environment } from '../../../../../environments/environment';
import { I18nService, Lang } from '../../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../../core/i18n/t.pipe';
import { BrandLogoComponent } from '../../../../shared/components/brand-logo/brand-logo.component';

/**
 * Get Started: the logo and name, then "Get Started" (register, where the role is chosen)
 * or "I already have an account" (login). On a new phone it first asks for the language.
 * Direction contract: .impeccable/surfaces/src-app-features-auth.md
 */
@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.page.html',
  styleUrls: ['./welcome.page.scss'],
  imports: [IonContent, IonIcon, RouterLink, BrandLogoComponent, TranslatePipe],
})
export class WelcomePage {
  protected readonly i18n = inject(I18nService);
  // Shows the dev-only diagnostics link; false in production builds.
  protected readonly isDev = !environment.production;

  /** The user tapped "Language: …" to pick again. */
  private readonly reopened = signal(false);
  protected readonly choosingLanguage = computed(() => !this.i18n.chosen() || this.reopened());

  constructor() {
    addIcons({ languageOutline });
  }

  protected async choose(lang: Lang): Promise<void> {
    await this.i18n.setLang(lang);
    this.reopened.set(false);
  }

  protected changeLanguage(): void {
    this.reopened.set(true);
  }
}
