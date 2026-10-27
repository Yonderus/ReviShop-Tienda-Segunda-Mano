import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnChanges,
  OnInit,
  SimpleChanges,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiError, ApiFieldError } from '../../../core/models/api-error.model';
import { FormFieldErrorComponent } from '../../../shared/components/form-field-error/form-field-error.component';
import { IconComponent } from '../../../shared/ui/icon.component';
import { applyServerErrors } from '../../../shared/utils/form-errors';
import { notBlank, oneOf, phoneNumber } from '../../../shared/utils/validators';
import { Role } from '../../users/models/role.model';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  USER_STATUSES,
  USER_STATUS_LABELS,
  User,
  UserInput,
  UserStatus,
} from '../../users/models/user.model';
import { userToInput } from '../../users/models/user.utils';

const FIELD_ORDER = ['name', 'email', 'password', 'roleId', 'status', 'phone', 'location', 'bio'] as const;
type FieldName = (typeof FIELD_ORDER)[number];

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, FormFieldErrorComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="space-y-6">
      @if (generalError(); as error) {
        <div class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
          <p class="font-semibold">{{ error.message }}</p>
          @if (error.items.length) {
            <ul class="mt-2 list-disc space-y-1 pl-5">
              @for (item of error.items; track $index) {
                <li>{{ item.message }}</li>
              }
            </ul>
          }
        </div>
      }

      <section class="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6" aria-labelledby="uf-s-account">
        <h2 id="uf-s-account" class="text-base font-semibold text-ink">Cuenta</h2>
        <div class="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <label for="uf-name" class="field-label">Nombre</label>
            <input
              id="uf-name"
              type="text"
              formControlName="name"
              class="field-control"
              autocomplete="off"
              maxlength="60"
              [attr.aria-invalid]="showError('name')"
              aria-describedby="uf-name-error"
            />
            <app-form-field-error errorId="uf-name-error" label="El nombre" [errors]="f.name.errors" [show]="showError('name')" />
          </div>

          <div>
            <label for="uf-email" class="field-label">Email</label>
            <input
              id="uf-email"
              type="email"
              formControlName="email"
              class="field-control"
              autocomplete="off"
              maxlength="120"
              [attr.aria-invalid]="showError('email')"
              aria-describedby="uf-email-error"
            />
            <app-form-field-error errorId="uf-email-error" label="El email" [errors]="f.email.errors" [show]="showError('email')" />
          </div>

          <div class="sm:col-span-2">
            <label for="uf-password" class="field-label">
              Contraseña
              @if (isEdit()) {
                <span class="font-normal text-ink-muted">(opcional)</span>
              }
            </label>
            <div class="relative">
              <input
                id="uf-password"
                [type]="showPassword() ? 'text' : 'password'"
                formControlName="password"
                class="field-control pr-12"
                autocomplete="new-password"
                [attr.maxlength]="passwordMax"
                [attr.aria-invalid]="showError('password')"
                aria-describedby="uf-password-hint uf-password-error"
              />
              <button
                type="button"
                class="icon-btn absolute right-1 top-1/2 -translate-y-1/2"
                [attr.aria-label]="showPassword() ? 'Ocultar la contraseña' : 'Mostrar la contraseña'"
                [attr.aria-pressed]="showPassword()"
                aria-controls="uf-password"
                (click)="showPassword.set(!showPassword())"
              >
                <app-icon [name]="showPassword() ? 'eyeOff' : 'eye'" [size]="18" />
              </button>
            </div>
            <p id="uf-password-hint" class="field-hint">
              {{ isEdit() ? 'Déjala vacía para no cambiarla. ' : '' }}Mínimo {{ passwordMin }} caracteres. Se guarda cifrada: nadie puede verla después.
            </p>
            <app-form-field-error errorId="uf-password-error" label="La contraseña" [errors]="f.password.errors" [show]="showError('password')" />
          </div>

          <div>
            <label for="uf-roleId" class="field-label">Rol</label>
            @if (roles().length === 0 && !rolesFailed()) {
              <div class="h-11 animate-pulse rounded-xl bg-line" role="status" aria-label="Cargando roles"></div>
            } @else if (rolesFailed()) {
              <p class="text-sm text-red-700" role="alert">
                No se han podido cargar los roles.
                <button type="button" class="font-semibold underline" (click)="retryRoles.emit()">Reintentar</button>
              </p>
            } @else {
              <select
                id="uf-roleId"
                formControlName="roleId"
                class="field-control"
                [attr.aria-invalid]="showError('roleId')"
                aria-describedby="uf-roleId-error"
              >
                <option value="" disabled>Selecciona un rol</option>
                @for (role of roles(); track role._id) {
                  <option [value]="role._id">{{ role.name }}</option>
                }
              </select>
            }
            <app-form-field-error errorId="uf-roleId-error" label="El rol" [errors]="f.roleId.errors" [show]="showError('roleId')" />
          </div>

          <div>
            <label for="uf-status" class="field-label">Estado de la cuenta</label>
            <select
              id="uf-status"
              formControlName="status"
              class="field-control"
              [attr.aria-invalid]="showError('status')"
              aria-describedby="uf-status-hint uf-status-error"
            >
              @for (s of statuses; track s) {
                <option [value]="s">{{ statusLabels[s] }}</option>
              }
            </select>
            <p id="uf-status-hint" class="field-hint">Un usuario suspendido no puede vender.</p>
            <app-form-field-error errorId="uf-status-error" label="El estado" [errors]="f.status.errors" [show]="showError('status')" />
          </div>
        </div>
      </section>

      <section class="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6" aria-labelledby="uf-s-profile">
        <h2 id="uf-s-profile" class="text-base font-semibold text-ink">Perfil <span class="text-sm font-normal text-ink-muted">(opcional)</span></h2>
        <div class="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <label for="uf-phone" class="field-label">Teléfono</label>
            <input
              id="uf-phone"
              type="tel"
              formControlName="phone"
              class="field-control"
              autocomplete="off"
              maxlength="20"
              placeholder="+34 600 000 000"
              [attr.aria-invalid]="showError('phone')"
              aria-describedby="uf-phone-error"
            />
            <app-form-field-error errorId="uf-phone-error" label="El teléfono" [errors]="f.phone.errors" [show]="showError('phone')" />
          </div>
          <div>
            <label for="uf-location" class="field-label">Ubicación</label>
            <input
              id="uf-location"
              type="text"
              formControlName="location"
              class="field-control"
              autocomplete="off"
              maxlength="100"
              placeholder="Ej.: Valencia"
              [attr.aria-invalid]="showError('location')"
              aria-describedby="uf-location-error"
            />
            <app-form-field-error errorId="uf-location-error" label="La ubicación" [errors]="f.location.errors" [show]="showError('location')" />
          </div>
          <div class="sm:col-span-2">
            <div class="flex items-baseline justify-between gap-3">
              <label for="uf-bio" class="field-label">Bio</label>
              <span class="text-xs tabular-nums text-ink-muted" aria-hidden="true">{{ f.bio.value.length }}/300</span>
            </div>
            <textarea
              id="uf-bio"
              formControlName="bio"
              rows="3"
              class="field-control"
              maxlength="300"
              [attr.aria-invalid]="showError('bio')"
              aria-describedby="uf-bio-error"
            ></textarea>
            <app-form-field-error errorId="uf-bio-error" label="La bio" [errors]="f.bio.errors" [show]="showError('bio')" />
          </div>
        </div>
      </section>

      <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <a [routerLink]="cancelLink()" class="btn btn-secondary">Cancelar</a>
        <button type="submit" class="btn btn-primary min-w-44" [disabled]="saving()" [attr.aria-busy]="saving()">
          {{ saving() ? 'Guardando…' : isEdit() ? 'Guardar cambios' : 'Crear usuario' }}
        </button>
      </div>
    </form>
  `,
})
export class UserFormComponent implements OnInit, OnChanges {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly user = input<User | null>(null);
  readonly roles = input<readonly Role[]>([]);
  readonly rolesFailed = input(false);
  readonly saving = input(false);
  readonly serverError = input<ApiError | null>(null);
  readonly cancelLink = input('/admin/users');
  readonly submitted = output<UserInput>();
  readonly retryRoles = output<void>();

  protected readonly statuses = USER_STATUSES;
  protected readonly statusLabels = USER_STATUS_LABELS;
  protected readonly passwordMin = PASSWORD_MIN_LENGTH;
  protected readonly passwordMax = PASSWORD_MAX_LENGTH;

  protected readonly submitAttempted = signal(false);
  protected readonly showPassword = signal(false);
  protected readonly isEdit = computed(() => this.user() !== null);

  private readonly unplacedErrors = signal<readonly ApiFieldError[]>([]);

  protected readonly generalError = computed(() => {
    const error = this.serverError();
    const items = this.unplacedErrors();
    if (!error || (error.errors.length > 0 && items.length === 0)) return null;
    return { message: error.message, items };
  });

  protected readonly form = this.fb.group({
    name: ['', [Validators.required, notBlank, Validators.minLength(2), Validators.maxLength(60)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(120)]],
    // Obligatoria solo al crear (se añade en ngOnInit).
    password: ['', [Validators.minLength(PASSWORD_MIN_LENGTH), Validators.maxLength(PASSWORD_MAX_LENGTH)]],
    roleId: ['', [Validators.required]],
    status: this.fb.control<UserStatus>('pending', [Validators.required, oneOf(USER_STATUSES)]),
    phone: ['', [Validators.maxLength(20), phoneNumber]],
    location: ['', [Validators.maxLength(100)]],
    bio: ['', [Validators.maxLength(300)]],
  });

  protected readonly f = this.form.controls;

  ngOnInit(): void {
    const user = this.user();
    if (user) {
      this.form.patchValue(userToInput(user));
      return;
    }
    this.f.password.addValidators(Validators.required);
    this.f.password.updateValueAndValidity();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['serverError']) return;
    const errors = this.serverError()?.errors ?? [];
    const unplaced = applyServerErrors(this.form, errors);
    this.unplacedErrors.set(unplaced);
    const firstPlaced = errors.find((error) => !unplaced.includes(error));
    if (firstPlaced?.field) this.focus(`uf-${firstPlaced.field}`);
  }

  protected showError(name: FieldName): boolean {
    const control = this.f[name];
    return control.invalid && (control.touched || this.submitAttempted());
  }

  protected submit(): void {
    this.submitAttempted.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const name = FIELD_ORDER.find((field) => this.f[field].invalid);
      if (name) this.focus(`uf-${name}`);
      return;
    }
    this.submitted.emit(this.toInput());
  }

  private toInput(): UserInput {
    const v = this.form.getRawValue();
    return {
      name: v.name.trim(),
      email: v.email.trim().toLowerCase(),
      password: v.password,
      roleId: v.roleId,
      phone: v.phone.trim(),
      location: v.location.trim(),
      bio: v.bio.trim(),
      status: v.status,
    };
  }

  private focus(id: string): void {
    this.host.nativeElement.querySelector<HTMLElement>(`#${id}`)?.focus();
  }
}
