import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService } from './i18n.service';
import { MessageKey } from './messages.en';

/**
 * In templates: {{ 'login.title' | t }} or {{ 'home.helloLead' | t: { name: firstName() } }}.
 * Not pure: the same key gives a different text after the language changes. The language is a
 * signal read inside t(), so the template re-renders by itself when it changes.
 */
@Pipe({ name: 't', pure: false })
export class TranslatePipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  transform(key: MessageKey, params?: Record<string, string | number>): string {
    return this.i18n.t(key, params);
  }
}
