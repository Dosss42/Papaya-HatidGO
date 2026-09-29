import { Injectable, inject, signal } from '@angular/core';
import { AppSettingsRepository } from '../database/app-settings.repository';
import { EN, MessageKey } from './messages.en';
import { FIL } from './messages.fil';

/** 'en' = English, 'fil' = Taglish (the same codes the API uses: Accept-Language). */
export type Lang = 'en' | 'fil';

const DICTIONARIES: Record<Lang, Record<MessageKey, string>> = { en: EN, fil: FIL };

/** Until someone picks, the app speaks Taglish (the product's original language). */
const DEFAULT_LANG: Lang = 'fil';

/**
 * The app's language. The choice is saved on the phone (app_settings.language, SQLite on Android)
 * and sent to the API with every request (auth-interceptor: Accept-Language), so screens and
 * server messages always match.
 *
 * t() reads a signal, so every template that shows a translated text updates the moment the
 * language changes, with no reload.
 */
@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly settings = inject(AppSettingsRepository);
  private readonly current = signal<Lang>(DEFAULT_LANG);
  private readonly picked = signal(false);

  readonly lang = this.current.asReadonly();
  /** False on a new phone: Get Started first asks "English · Taglish". */
  readonly chosen = this.picked.asReadonly();

  /** Runs once at startup, before the first screen (main.ts). Never throws. */
  async load(): Promise<void> {
    this.apply(DEFAULT_LANG);
    try {
      const saved = await this.settings.get('language');
      if (saved === 'en' || saved === 'fil') {
        this.apply(saved);
        this.picked.set(true);
      }
    } catch (err) {
      console.warn('Could not read the language setting', err);
    }
  }

  async setLang(lang: Lang): Promise<void> {
    this.apply(lang);
    this.picked.set(true);
    try {
      await this.settings.set('language', lang);
    } catch (err) {
      console.warn('Could not save the language setting', err);
    }
  }

  /** The text for a key in the current language; {name}-style placeholders are filled from params. */
  t(key: MessageKey, params?: Record<string, string | number>): string {
    const text = DICTIONARIES[this.current()][key];
    if (!params) {
      return text;
    }
    return text.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
  }

  private apply(lang: Lang): void {
    this.current.set(lang);
    // Screen readers pick their pronunciation from <html lang>.
    document.documentElement.lang = lang;
  }
}
