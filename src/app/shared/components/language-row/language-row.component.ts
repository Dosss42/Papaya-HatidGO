import { Component, inject } from '@angular/core';
import { ActionSheetController, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronForward, languageOutline } from 'ionicons/icons';
import { I18nService, Lang } from '../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../core/i18n/t.pipe';

/**
 * Account › Language: shows the current language; tapping opens a picker (English · Taglish).
 * The change applies at once to every screen and to the API's messages.
 */
@Component({
  selector: 'app-language-row',
  imports: [IonIcon, TranslatePipe],
  template: `
    <button type="button" class="hg-menu__row" (click)="pick()">
      <ion-icon name="language-outline" aria-hidden="true" />
      <span class="hg-menu__label">{{ 'lang.setting' | t }}</span>
      <span class="language-row__value">{{ name(i18n.lang()) }}</span>
      <ion-icon class="language-row__go" name="chevron-forward" aria-hidden="true" />
    </button>
  `,
  styles: `
    :host { display: block; }
    .language-row__value { font-weight: 400; color: var(--hg-ink-soft); }
    .language-row__go { font-size: 22px; color: var(--hg-ink-soft); }
  `,
})
export class LanguageRowComponent {
  protected readonly i18n = inject(I18nService);
  private readonly sheets = inject(ActionSheetController);

  constructor() {
    addIcons({ languageOutline, chevronForward });
  }

  /** Each language is always named in itself, so it's findable whatever is showing now. */
  protected name(lang: Lang): string {
    return lang === 'en' ? 'English' : 'Taglish';
  }

  protected async pick(): Promise<void> {
    const current = this.i18n.lang();
    const option = (lang: Lang) => ({
      text: `${this.name(lang)}${lang === current ? ' ✓' : ''}`,
      handler: () => void this.i18n.setLang(lang),
    });
    const sheet = await this.sheets.create({
      header: this.i18n.t('lang.setting'),
      buttons: [option('en'), option('fil'), { text: this.i18n.t('common.cancel'), role: 'cancel' }],
    });
    await sheet.present();
  }
}
