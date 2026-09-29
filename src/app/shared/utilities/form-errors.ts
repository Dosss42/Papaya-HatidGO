import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** At least 8 characters with a letter and a number: the same rule the API enforces. */
export const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

/** Group validator: the two password fields must match. */
export function passwordsMatch(field = 'password', confirm = 'password_confirmation'): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const a = group.get(field)?.value;
    const b = group.get(confirm)?.value;
    return a && b && a !== b ? { mismatch: true } : null;
  };
}

/**
 * The first client-side problem of a control, in plain Taglish (glossary: design-briefs § 8).
 * Shown only after the user has touched the field, never while they are still typing the first time.
 */
export function clientError(control: AbstractControl | null, label: string): string | null {
  if (!control || !control.touched || !control.errors) {
    return null;
  }
  const e = control.errors;
  if (e['required']) return `Ilagay ang ${label}.`;
  if (e['email']) return 'Hindi valid ang email. Halimbawa: juan@gmail.com';
  if (e['pattern'] && label === 'password') return 'Dapat 8 o higit pang character, may letra at numero.';
  if (e['pattern']) return `Tingnan ulit ang ${label}.`;
  if (e['minlength'] || e['maxlength']) return `Tingnan ulit ang ${label}.`;
  return null;
}
