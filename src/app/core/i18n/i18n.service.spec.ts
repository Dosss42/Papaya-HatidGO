import { TestBed } from '@angular/core/testing';
import { AppSettingsRepository } from '../database/app-settings.repository';
import { I18nService } from './i18n.service';
import { EN } from './messages.en';
import { FIL } from './messages.fil';

describe('I18nService', () => {
  let i18n: I18nService;
  let settings: AppSettingsRepository;

  beforeEach(() => {
    i18n = TestBed.inject(I18nService);
    settings = TestBed.inject(AppSettingsRepository); // the memory version in tests
  });

  it('starts in Taglish, not yet chosen, on a new phone', async () => {
    await i18n.load();
    expect(i18n.lang()).toBe('fil');
    expect(i18n.chosen()).toBe(false);
    expect(i18n.t('logout.confirmTitle')).toBe('Mag-logout?');
  });

  it('switches, remembers the choice, and sets <html lang>', async () => {
    await i18n.setLang('en');
    expect(i18n.t('logout.confirmTitle')).toBe('Log out?');
    expect(await settings.get('language')).toBe('en');
    expect(document.documentElement.lang).toBe('en');
    expect(i18n.chosen()).toBe(true);
  });

  it('restores the saved language at startup', async () => {
    await settings.set('language', 'en');
    await i18n.load();
    expect(i18n.lang()).toBe('en');
    expect(i18n.chosen()).toBe(true);
  });

  it('fills placeholders', async () => {
    await i18n.setLang('fil');
    expect(i18n.t('home.helloLead', { name: 'Juan' })).toBe('Kumusta, Juan.');
    expect(i18n.t('forgot.step', { n: 2 })).toBe('Hakbang 2 sa 2');
  });

  it('keeps the same placeholders in both languages', () => {
    const names = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort().join(',');
    for (const key of Object.keys(EN) as (keyof typeof EN)[]) {
      expect(names(FIL[key]), key).toBe(names(EN[key]));
    }
  });

  it('never leaves a text empty', () => {
    for (const dict of [EN, FIL] as Record<string, string>[]) {
      for (const [key, text] of Object.entries(dict)) {
        expect(text.trim(), key).not.toBe('');
      }
    }
  });
});
