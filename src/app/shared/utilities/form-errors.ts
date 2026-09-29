import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { MessageKey } from '../../core/i18n/messages.en';

/** At least 8 characters with a letter and a number: the same rule the API enforces. */
export const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*d).{8,}$/;

/** I18nService.t, passed in so this stays a plain function. */
type Translate = (key: MessageKey, params?: Record<string, string>) => string;

/** Group validator: the two password fields must match. */
export function passwordsMatch(field = 'password', confirm = 'password_confirmation'): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const a = group.get(field)?.value;
    const b = group.get(confirm)?.value;
    return a && b && a !== b ? { mismatch: true } : null;
  };
}

/**
 * The first client-side problem of a control, in the app's language.
 * Shown only after the user has touched the field, never while they are still typing the first time.
 * @param labelKey how the field is named inside a sentence, e.g. 'label.email' → "Enter your email."
 * @param isPassword a pattern error on a password means the password rule, not "check again"
 */
export function clientError(
  control: AbstractControl | null,
  labelKey: MessageKey,
  t: Translate,
  isPassword = false,
): string | null {
  if (!control || !control.touched || !control.errors) {
    return null;
  }
  const e = control.errors;
  const label = t(labelKey);
  if (e['required']) return t('error.required', { label });
  if (e['email']) return t('error.email');
  if (e['pattern'] && isPassword) return t('error.passwordRule');
  if (e['pattern'] || e['minlength'] || e['maxlength']) return t('error.check', { label });
  return null;
}
