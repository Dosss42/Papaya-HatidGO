import { Component, OnInit, inject, input, signal } from '@angular/core';
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
import { alertCircle, checkmarkCircle, personOutline } from 'ionicons/icons';
import { AuthService } from '../../../../core/services/auth.service';
import { RegisterPayload } from '../../../../shared/models/auth.model';
import { ApiError } from '../../../../shared/utilities/api-error';
import { PASSWORD_RULE, clientError, passwordsMatch } from '../../../../shared/utilities/form-errors';

type RoleChoice = 'passenger' | 'driver';
type FieldName = 'first_name' | 'last_name' | 'phone' | 'email' | 'password' | 'password_confirmation';

/** Create a passenger or driver account (contract: phase-5-authentication.md § 3.1). */
@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
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
export class RegisterPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** From the Welcome pila row: /auth/register?role=passenger|driver (router input binding). */
  readonly roleParam = input<string | undefined>(undefined, { alias: 'role' });

  protected readonly form = inject(FormBuilder).nonNullable.group(
    {
      role: ['passenger' as RoleChoice, Validators.required],
      first_name: ['', [Validators.required, Validators.maxLength(80)]],
      last_name: ['', [Validators.required, Validators.maxLength(80)]],
      phone: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.pattern(PASSWORD_RULE)]],
      password_confirmation: ['', Validators.required],
    },
    { validators: passwordsMatch() },
  );

  protected readonly submitting = signal(false);
  protected readonly error = signal<ApiError | null>(null);

  private readonly labels: Record<FieldName, string> = {
    first_name: 'pangalan mo',
    last_name: 'apelyido mo',
    phone: 'mobile number mo',
    email: 'email mo',
    password: 'password',
    password_confirmation: 'password ulit',
  };

  constructor() {
    addIcons({ alertCircle, checkmarkCircle, personOutline }); // "tricycle" is registered app-wide (app.component.ts)
  }

  ngOnInit(): void {
    if (this.roleParam() === 'driver' || this.roleParam() === 'passenger') {
      this.form.controls.role.setValue(this.roleParam() as RoleChoice);
    }
  }

  protected chooseRole(role: RoleChoice): void {
    this.form.controls.role.setValue(role);
  }

  /** Field errors are shown under their fields; the top notice is only for errors without a field. */
  protected hasFieldErrors(e: ApiError): boolean {
    return Object.keys(e.fieldErrors).length > 0;
  }

  protected fieldError(name: FieldName): string | null {
    const control = this.form.controls[name];
    if (name === 'password_confirmation' && control.touched && this.form.errors?.['mismatch']) {
      return 'Hindi magkapareho ang password.';
    }
    return clientError(control, this.labels[name]) ?? this.error()?.fieldErrors[name] ?? null;
  }

  async submit(): Promise<void> {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.error.set(null);
    try {
      const user = await this.auth.register(this.form.getRawValue() as RegisterPayload);
      await this.router.navigateByUrl(this.auth.homeUrlFor(user.role) ?? '/auth/welcome', { replaceUrl: true });
    } catch (err) {
      this.error.set(err as ApiError);
    } finally {
      this.submitting.set(false);
    }
  }
}
