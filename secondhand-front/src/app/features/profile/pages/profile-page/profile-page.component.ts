import { ChangeDetectionStrategy, Component, ElementRef, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthStore } from '../../../../core/auth/auth.store';
import { ApiError, ApiFieldError } from '../../../../core/models/api-error.model';
import { AlertService } from '../../../../core/services/alert.service';
import { INLINE_FORM_STATUSES } from '../../../../core/config/app.constants';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { FormFieldErrorComponent } from '../../../../shared/components/form-field-error/form-field-error.component';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { AvatarComponent } from '../../../../shared/ui/avatar.component';
import { changedFields } from '../../../../shared/utils/diff';
import { applyServerErrors } from '../../../../shared/utils/form-errors';
import { httpUrl, phoneNumber } from '../../../../shared/utils/validators';
import { Profile, ProfileInput, profileToInput } from '../../models/profile.model';
import { ProfileService } from '../../services/profile.service';

const FIELD_ORDER = ['avatarUrl', 'phone', 'location', 'bio'] as const;
type FieldName = (typeof FIELD_ORDER)[number];

/**
 * Mi perfil: foto, teléfono, ubicación y bio (`/profile/me`). La cuenta (nombre, email, contraseña y rol)
 * solo se ve: la cambia un administrador desde el panel.
 */
@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [ReactiveFormsModule, AvatarComponent, FormFieldErrorComponent, SkeletonComponent, ErrorStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container-page max-w-3xl py-6 sm:py-10">
      <h1 class="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Mi perfil</h1>
      <p class="mt-2 text-[0.9375rem] text-ink-muted">Lo que verán los demás cuando compren o vendan contigo.</p>

      @if (auth.user(); as user) {
        <section class="mt-8 flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5 shadow-card sm:flex-row sm:items-center sm:p-6" aria-label="Tu cuenta">
          <app-avatar size="lg" [name]="user.name" [src]="previewUrl()" />
          <div class="min-w-0">
            <p class="truncate text-lg font-semibold text-ink">{{ user.name }}</p>
            <p class="truncate text-sm text-ink-muted">{{ user.email }}</p>
            @if (user.role) {
              <p class="mt-1 text-sm font-medium text-primary-700">{{ user.role.name }}</p>
            }
            <p class="mt-3 text-xs text-ink-muted">Para cambiar el nombre, el email o la contraseña, habla con un administrador.</p>
          </div>
        </section>
      }

      @if (loadError(); as error) {
        <app-error-state title="No hemos podido cargar tu perfil" [error]="error" (retry)="load()" />
      } @else if (!profile()) {
        <div class="mt-6"><app-skeleton variant="form" label="Cargando tu perfil…" /></div>
      } @else {
        <form [formGroup]="form" (ngSubmit)="save()" novalidate class="mt-6 space-y-6">
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

          <section class="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6" aria-labelledby="pp-s-profile">
            <h2 id="pp-s-profile" class="text-base font-semibold text-ink">Perfil <span class="text-sm font-normal text-ink-muted">(todo opcional)</span></h2>
            <div class="mt-5 grid gap-5 sm:grid-cols-2">
              <div class="sm:col-span-2">
                <label for="pp-avatarUrl" class="field-label">Foto (URL)</label>
                <input
                  id="pp-avatarUrl"
                  type="url"
                  formControlName="avatarUrl"
                  class="field-control"
                  autocomplete="photo"
                  inputmode="url"
                  placeholder="https://…"
                  [attr.aria-invalid]="showError('avatarUrl')"
                  aria-describedby="pp-avatarUrl-hint pp-avatarUrl-error"
                />
                <p id="pp-avatarUrl-hint" class="field-hint">Arriba ves cómo queda. Déjala vacía para quitar la foto.</p>
                <app-form-field-error errorId="pp-avatarUrl-error" label="La foto" [errors]="f.avatarUrl.errors" [show]="showError('avatarUrl')" />
              </div>
              <div>
                <label for="pp-phone" class="field-label">Teléfono</label>
                <input
                  id="pp-phone"
                  type="tel"
                  formControlName="phone"
                  class="field-control"
                  autocomplete="tel"
                  maxlength="20"
                  placeholder="+34 600 000 000"
                  [attr.aria-invalid]="showError('phone')"
                  aria-describedby="pp-phone-error"
                />
                <app-form-field-error errorId="pp-phone-error" label="El teléfono" [errors]="f.phone.errors" [show]="showError('phone')" />
              </div>
              <div>
                <label for="pp-location" class="field-label">Ubicación</label>
                <input
                  id="pp-location"
                  type="text"
                  formControlName="location"
                  class="field-control"
                  autocomplete="address-level2"
                  maxlength="100"
                  placeholder="Ej.: Valencia"
                  [attr.aria-invalid]="showError('location')"
                  aria-describedby="pp-location-error"
                />
                <app-form-field-error errorId="pp-location-error" label="La ubicación" [errors]="f.location.errors" [show]="showError('location')" />
              </div>
              <div class="sm:col-span-2">
                <div class="flex items-baseline justify-between gap-3">
                  <label for="pp-bio" class="field-label">Bio</label>
                  <span class="text-xs tabular-nums text-ink-muted" aria-hidden="true">{{ f.bio.value.length }}/300</span>
                </div>
                <textarea
                  id="pp-bio"
                  formControlName="bio"
                  rows="4"
                  class="field-control"
                  maxlength="300"
                  [attr.aria-invalid]="showError('bio')"
                  aria-describedby="pp-bio-error"
                ></textarea>
                <app-form-field-error errorId="pp-bio-error" label="La bio" [errors]="f.bio.errors" [show]="showError('bio')" />
              </div>
            </div>
          </section>

          <div class="flex justify-end">
            <button type="submit" class="btn btn-primary w-full sm:w-auto sm:min-w-44" [disabled]="saving()" [attr.aria-busy]="saving()">
              {{ saving() ? 'Guardando…' : 'Guardar cambios' }}
            </button>
          </div>
        </form>
      }
    </div>
  `,
})
export class ProfilePageComponent implements OnInit {
  protected readonly auth = inject(AuthStore);
  private readonly api = inject(ProfileService);
  private readonly alert = inject(AlertService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly profile = signal<Profile | null>(null);
  protected readonly loadError = signal<ApiError | null>(null);
  protected readonly saving = signal(false);
  protected readonly submitAttempted = signal(false);
  private readonly serverError = signal<ApiError | null>(null);
  private readonly unplacedErrors = signal<readonly ApiFieldError[]>([]);

  protected readonly form = this.fb.group({
    avatarUrl: ['', [httpUrl]],
    phone: ['', [Validators.maxLength(20), phoneNumber]],
    location: ['', [Validators.maxLength(100)]],
    bio: ['', [Validators.maxLength(300)]],
  });
  protected readonly f = this.form.controls;

  private readonly avatarValue = toSignal(this.f.avatarUrl.valueChanges, { initialValue: '' });
  /** Vista previa en vivo: la URL escrita si es válida; si no, la foto guardada. */
  protected readonly previewUrl = computed(() => {
    const typed = this.avatarValue().trim();
    if (typed && !httpUrl(this.f.avatarUrl)) return typed;
    return typed ? this.auth.user()?.avatarUrl : null;
  });

  protected readonly generalError = computed(() => {
    const error = this.serverError();
    const items = this.unplacedErrors();
    if (!error || (error.errors.length > 0 && items.length === 0)) return null;
    return { message: error.message, items };
  });

  ngOnInit(): void {
    void this.load();
  }

  protected async load(): Promise<void> {
    this.loadError.set(null);
    try {
      this.fill(await this.api.getMine());
    } catch (error) {
      this.loadError.set(error instanceof ApiError ? error : null);
    }
  }

  protected showError(name: FieldName): boolean {
    const control = this.f[name];
    return control.invalid && (control.touched || this.submitAttempted());
  }

  protected async save(): Promise<void> {
    const profile = this.profile();
    if (!profile) return;
    this.submitAttempted.set(true);
    this.serverError.set(null);
    this.unplacedErrors.set([]);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const name = FIELD_ORDER.find((field) => this.f[field].invalid);
      if (name) this.focus(`pp-${name}`);
      return;
    }

    const changes = changedFields(profileToInput(profile), this.toInput());
    if (Object.keys(changes).length === 0) {
      void this.alert.success('No había cambios que guardar');
      return;
    }

    this.saving.set(true);
    try {
      const updated = await this.api.updateMine(changes);
      this.fill(updated);
      this.auth.updateUser({
        avatarUrl: updated.avatarUrl,
        profile: { phone: updated.phone, location: updated.location, bio: updated.bio },
      });
      this.submitAttempted.set(false);
      void this.alert.success('Perfil actualizado');
    } catch (error) {
      if (!(error instanceof ApiError) || !INLINE_FORM_STATUSES.includes(error.status)) return;
      this.serverError.set(error);
      const unplaced = applyServerErrors(this.form, error.errors);
      this.unplacedErrors.set(unplaced);
      const firstPlaced = error.errors.find((item) => !unplaced.includes(item));
      if (firstPlaced?.field) this.focus(`pp-${firstPlaced.field}`);
    } finally {
      this.saving.set(false);
    }
  }

  private fill(profile: Profile): void {
    this.profile.set(profile);
    const { avatarUrl, ...rest } = profileToInput(profile);
    this.form.reset({ ...rest, avatarUrl: avatarUrl ?? '' });
  }

  private toInput(): ProfileInput {
    const v = this.form.getRawValue();
    return {
      phone: v.phone.trim(),
      location: v.location.trim(),
      bio: v.bio.trim(),
      avatarUrl: v.avatarUrl.trim() || null,
    };
  }

  private focus(id: string): void {
    this.host.nativeElement.querySelector<HTMLElement>(`#${id}`)?.focus();
  }
}
