import { ChangeDetectionStrategy, Component, OnChanges, OnDestroy, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { INLINE_FORM_STATUSES } from '../../../core/config/app.constants';
import { ApiError } from '../../../core/models/api-error.model';
import { AlertService } from '../../../core/services/alert.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { BadgeComponent } from '../../../shared/ui/badge.component';
import { USER_STATUS_LABELS, USER_STATUS_TONES, User, UserInput } from '../../users/models/user.model';
import { diffUser } from '../../users/models/user.utils';
import { UsersStore } from '../../users/store/users.store';
import { UserFormComponent } from './user-form.component';

@Component({
  selector: 'app-admin-user-edit-page',
  standalone: true,
  imports: [RouterLink, UserFormComponent, SkeletonComponent, ErrorStateComponent, EmptyStateComponent, BadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto max-w-3xl">
      @switch (store.detailStatus()) {
        @case ('not-found') {
          <app-empty-state
            icon="search"
            title="Usuario no encontrado"
            message="No existe o está en la papelera. Los de la papelera hay que restaurarlos antes de editarlos."
          >
            <a routerLink="/admin/users/trash" class="btn btn-secondary">Ir a la papelera</a>
            <a routerLink="/admin/users" class="btn btn-primary">Volver a usuarios</a>
          </app-empty-state>
        }
        @case ('error') {
          <app-error-state title="No hemos podido cargar el usuario" [error]="store.detailError()" (retry)="load()" />
        }
        @default {
          @if (store.selectedComplete(); as user) {
            <div class="flex flex-wrap items-center gap-3">
              <h1 class="text-2xl font-semibold tracking-tight text-ink">Editar usuario</h1>
              <app-badge [tone]="statusTones[user.status]">{{ statusLabels[user.status] }}</app-badge>
              <app-badge [tone]="user.isActive ? 'success' : 'neutral'">{{ user.isActive ? 'Activo' : 'Inactivo' }}</app-badge>
            </div>
            <p class="mt-1 text-sm text-ink-muted">
              {{ user.productsCount }} {{ user.productsCount === 1 ? 'producto' : 'productos' }} ·
              Solo se guardan los campos que cambies. La visibilidad se cambia desde la lista.
            </p>
            <div class="mt-6">
              <app-user-form
                [user]="user"
                [roles]="store.roles()"
                [rolesFailed]="store.rolesError() !== null"
                [saving]="store.saving()"
                [serverError]="serverError()"
                [cancelLink]="listLink(user)"
                (retryRoles)="store.loadRoles({ force: true })"
                (submitted)="save(user, $event)"
              />
            </div>
          } @else {
            <app-skeleton variant="form" [count]="5" label="Cargando usuario…" />
          }
        }
      }
    </div>
  `,
})
export class AdminUserEditPageComponent implements OnChanges, OnDestroy {
  protected readonly store = inject(UsersStore);
  private readonly router = inject(Router);
  private readonly alert = inject(AlertService);

  readonly slug = input.required<string>();
  protected readonly serverError = signal<ApiError | null>(null);
  protected readonly statusLabels = USER_STATUS_LABELS;
  protected readonly statusTones = USER_STATUS_TONES;

  ngOnChanges(): void {
    void this.load();
  }

  ngOnDestroy(): void {
    this.store.clearSelected();
  }

  protected async load(): Promise<void> {
    void this.store.loadRoles();
    await this.store.loadBySlug(this.slug());
  }

  protected listLink(user: User): string {
    return user.isActive ? '/admin/users' : '/admin/users/inactive';
  }

  protected async save(user: User, input: UserInput): Promise<void> {
    this.serverError.set(null);
    const changes = diffUser(user, input);
    if (Object.keys(changes).length === 0) {
      void this.alert.success('No había cambios que guardar');
      void this.router.navigateByUrl(this.listLink(user));
      return;
    }

    try {
      const updated = await this.store.update(user, changes);
      void this.alert.success(changes.password ? 'Cambios guardados (contraseña incluida)' : 'Cambios guardados');
      void this.router.navigateByUrl(this.listLink(updated));
    } catch (error) {
      // 422 y 409 de campo (email) van junto al campo; el 409 del último admin, arriba del formulario.
      if (error instanceof ApiError && INLINE_FORM_STATUSES.includes(error.status)) this.serverError.set(error);
    }
  }
}
