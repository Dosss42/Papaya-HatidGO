import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonInputPasswordToggle,
  IonSpinner,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { alertCircle, checkmarkCircle, mailOutline } from 'ionicons/icons';
import { AuthService } from '../../../../core/services/auth.service';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../../core/i18n/t.pipe';
import { ApiError } from '../../../../shared/utilities/api-error';
import { PASSWORD_RULE, clientError, passwordsMatch } from '../../../../shared/utilities/form-errors';

type Step = 'email' | 'code' | 'done';

/**
 * Forgot password with a 6-digit code (contracts: phase-5-authentication.md § 3.5–3.6).
 * One screen, three steps: email → code + new password → done.
 */
@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss'],
  imports: [
    ReactiveFormsModule,
    RouterLink,
    IonBackButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonInput,
    IonInputPasswordToggle,
    IonSpinner,
    IonToolbar,
    TranslatePipe,
  ],
})
export class ForgotPasswordPage {
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly i18n = inject(I18nService);

  protected readonly step = signal<Step>('email');
  protected readonly submitting = signal(false);
  protected readonly error = signal<ApiError | null>(null);
  protected readonly info = signal<string | null>(null);

  protected readonly emailForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected readonly resetForm = this.fb.group(
    {
      code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
      password: ['', [Validators.required, Validators.pattern(PASSWORD_RULE)]],
      password_confirmation: ['', Validators.required],
    },
    { validators: passwordsMatch() },
  );

  constructor() {
    addIcons({ alertCircle, checkmarkCircle, mailOutline });
  }

  protected emailError(): string | null {
    const t = this.i18n.t.bind(this.i18n);
    return clientError(this.emailForm.controls.email, 'label.email', t) ?? this.error()?.fieldErrors['email'] ?? null;
  }

  protected resetError(name: 'code' | 'password' | 'password_confirmation'): string | null {
    const control = this.resetForm.controls[name];
    if (name === 'password_confirmation' && control.touched && this.resetForm.errors?.['mismatch']) {
      return this.i18n.t('error.mismatch');
    }
    if (name === 'code' && control.touched && control.errors?.['pattern']) {
      return this.i18n.t('error.code');
    }
    const label = name === 'code' ? 'label.code' : name === 'password' ? 'label.password' : 'label.passwordAgain';
    const t = this.i18n.t.bind(this.i18n);
    return clientError(control, label, t, name === 'password') ?? this.error()?.fieldErrors[name] ?? null;
  }

  async sendCode(): Promise<void> {
    if (this.emailForm.invalid || this.submitting()) {
      this.emailForm.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.error.set(null);
    try {
      this.info.set(await this.auth.forgotPassword(this.emailForm.controls.email.value));
      this.step.set('code');
    } catch (err) {
      this.error.set(err as ApiError);
    } finally {
      this.submitting.set(false);
    }
  }

  async reset(): Promise<void> {
    if (this.resetForm.invalid || this.submitting()) {
      this.resetForm.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.error.set(null);
    try {
      const { code, password, password_confirmation } = this.resetForm.getRawValue();
      this.info.set(
        await this.auth.resetPassword(this.emailForm.controls.email.value, code, password, password_confirmation),
      );
      this.step.set('done');
    } catch (err) {
      this.error.set(err as ApiError);
    } finally {
      this.submitting.set(false);
    }
  }

  /** "Hindi natanggap?": back to step 1 with the same email, to request a new code. */
  protected startOver(): void {
    this.error.set(null);
    this.info.set(null);
    this.resetForm.reset();
    this.step.set('email');
  }
}
