import { ChangeDetectionStrategy, Component, ElementRef, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthUser, ROLE } from '../../../../core/auth/auth.models';
import { AuthStore } from '../../../../core/auth/auth.store';
import { ApiError } from '../../../../core/models/api-error.model';
import { AlertService } from '../../../../core/services/alert.service';
import { FormFieldErrorComponent } from '../../../../shared/components/form-field-error/form-field-error.component';
import { IconComponent } from '../../../../shared/ui/icon.component';
import { applyServerErrors } from '../../../../shared/utils/form-errors';

/** Solo rutas de esta app: un `returnUrl` hacia otra web (o `//otra-web`) se ignora. */
const isInternalUrl = (url: string | undefined): url is string =>
  !!url && url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/login');

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, FormFieldErrorComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="container-page flex justify-center py-12 sm:py-20">
      <div class="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-card sm:p-8">
        <span class="inline-flex size-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-600" aria-hidden="true">
          <app-icon name="lock" [size]="24" />
        </span>
        <h1 class="mt-4 text-2xl font-semibold tracking-tight text-ink">Iniciar sesión</h1>
        <p class="mt-1 text-sm text-ink-muted">Entra con tu cuenta de Revishop para publicar y gestionar tus anuncios.</p>

        @if (serverMessage(); as message) {
          <div class="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800" role="alert">{{ message }}</div>
        }

        <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="mt-6 space-y-5">
          <div>
            <label for="login-email" class="field-label">Email</label>
            <input
              id="login-email"
              type="email"
              formControlName="email"
              class="field-control"
              autocomplete="username"
              inputmode="email"
              [attr.aria-invalid]="showError('email')"
              aria-describedby="login-email-error"
            />
            <app-form-field-error errorId="login-email-error" label="El email" [errors]="f.email.errors" [show]="showError('email')" />
          </div>

          <div>
            <label for="login-password" class="field-label">Contraseña</label>
            <div class="relative">
              <input
                id="login-password"
                [type]="showPassword() ? 'text' : 'password'"
                formControlName="password"
                class="field-control pr-12"
                autocomplete="current-password"
                [attr.aria-invalid]="showError('password')"
                aria-describedby="login-password-error"
              />
              <button
                type="button"
                class="icon-btn absolute right-1 top-1/2 -translate-y-1/2"
                [attr.aria-label]="showPassword() ? 'Ocultar la contraseña' : 'Mostrar la contraseña'"
                [attr.aria-pressed]="showPassword()"
                aria-controls="login-password"
                (click)="showPassword.set(!showPassword())"
              >
                <app-icon [name]="showPassword() ? 'eyeOff' : 'eye'" [size]="18" />
              </button>
            </div>
            <app-form-field-error errorId="login-password-error" label="La contraseña" [errors]="f.password.errors" [show]="showError('password')" />
          </div>

          <button type="submit" class="btn btn-primary w-full" [disabled]="sending()" [attr.aria-busy]="sending()">
            {{ sending() ? 'Entrando…' : 'Entrar' }}
          </button>
        </form>

        <p class="mt-6 text-center text-sm text-ink-muted">
          <a routerLink="/" class="font-medium text-primary-700 hover:underline">Seguir sin iniciar sesión</a>
        </p>
      </div>
    </section>
  `,
})
export class LoginPageComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly store = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly alert = inject(AlertService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** `?returnUrl=…`: adónde volver al entrar (lo pone el guard o el interceptor). */
  readonly returnUrl = input<string>();

  protected readonly showPassword = signal(false);
  protected readonly sending = signal(false);
  protected readonly submitAttempted = signal(false);
  /** 401 (credenciales), 403 (cuenta que no puede entrar), 429 (demasiados intentos) o sin red: arriba del formulario. */
  protected readonly serverMessage = signal<string | null>(null);

  protected readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });
  protected readonly f = this.form.controls;

  protected showError(name: 'email' | 'password'): boolean {
    const control = this.f[name];
    return control.invalid && (control.touched || this.submitAttempted());
  }

  protected async submit(): Promise<void> {
    this.submitAttempted.set(true);
    this.serverMessage.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.focus(this.f.email.invalid ? 'login-email' : 'login-password');
      return;
    }

    this.sending.set(true);
    try {
      const { email, password } = this.form.getRawValue();
      const user = await this.store.login({ email: email.trim().toLowerCase(), password });
      void this.alert.success(`Hola, ${user.name.split(' ')[0]}`);
      void this.router.navigateByUrl(this.destination(user));
    } catch (error) {
      if (!(error instanceof ApiError)) return;
      const unplaced = error.status === 422 ? applyServerErrors(this.form, error.errors) : [];
      if (error.status !== 422 || unplaced.length) this.serverMessage.set(unplaced[0]?.message ?? error.message);
      // Tras un fallo se vacía la contraseña y vuelve el foco, para reintentar sin borrarla a mano
      // (sin marcarla como "obligatoria": el aviso que importa es el del servidor).
      this.submitAttempted.set(false);
      this.f.password.reset('');
      this.focus('login-password');
    } finally {
      this.sending.set(false);
    }
  }

  /** Adonde se iba (si es una ruta de la app); si no, el admin al panel y el resto a la tienda. */
  private destination(user: AuthUser): string {
    const returnUrl = this.returnUrl();
    if (isInternalUrl(returnUrl)) return returnUrl;
    return user.role?.slug === ROLE.ADMIN ? '/admin' : '/';
  }

  private focus(id: string): void {
    this.host.nativeElement.querySelector<HTMLElement>(`#${id}`)?.focus();
  }
}
