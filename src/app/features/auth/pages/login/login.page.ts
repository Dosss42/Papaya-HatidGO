import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
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
import { alertCircle } from 'ionicons/icons';
import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../../core/services/auth.service';
import { ApiError } from '../../../../shared/utilities/api-error';
import { clientError } from '../../../../shared/utilities/form-errors';

/** Log in with email or mobile number (contract: phase-5-authentication.md § 3.2). */
@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
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
  ],
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    login: ['', Validators.required], // email or mobile number
    password: ['', Validators.required],
  });

  protected readonly submitting = signal(false);
  protected readonly error = signal<ApiError | null>(null);
  protected readonly isDev = !environment.production;

  constructor() {
    addIcons({ alertCircle });
  }

  protected fieldError(name: 'login' | 'password'): string | null {
    const label = name === 'login' ? 'email o mobile number mo' : 'password mo';
    return clientError(this.form.controls[name], label) ?? this.error()?.fieldErrors[name] ?? null;
  }

  async submit(): Promise<void> {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.error.set(null);
    try {
      const { login, password } = this.form.getRawValue();
      const user = await this.auth.login(login, password);
      // replaceUrl: the Back button must not return to the login form after logging in.
      await this.router.navigateByUrl(this.auth.homeUrlFor(user.role) ?? '/auth/welcome', { replaceUrl: true });
    } catch (err) {
      this.error.set(err as ApiError);
    } finally {
      this.submitting.set(false);
    }
  }

  /** DEV ONLY: fill a seeded account (DevelopmentSeeder). Hidden in production builds. */
  fillDev(email: string): void {
    this.form.setValue({ login: email, password: 'password' });
  }
}
