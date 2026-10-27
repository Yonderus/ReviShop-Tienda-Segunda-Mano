import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiError } from '../../../core/models/api-error.model';
import { AlertService } from '../../../core/services/alert.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { IconComponent } from '../../../shared/ui/icon.component';
import { RelativeTimePipe } from '../../../shared/utils/relative-time.pipe';
import { User } from '../../users/models/user.model';
import { initials } from '../../users/models/user.utils';
import { UsersStore } from '../../users/store/users.store';
import { prefersReducedMotion, rowLeave } from '../admin.animations';
import { AdminTabsComponent, sectionTabs } from '../components/admin-tabs/admin-tabs.component';

@Component({
  selector: 'app-admin-users-trash-page',
  standalone: true,
  imports: [RouterLink, DatePipe, RelativeTimePipe, IconComponent, SkeletonComponent, EmptyStateComponent, ErrorStateComponent, AdminTabsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [rowLeave],
  template: `
    <div class="mx-auto max-w-6xl" [@.disabled]="reducedMotion">
      <header class="mb-5">
        <h1 class="text-2xl font-semibold tracking-tight text-ink">Usuarios</h1>
        <p class="mt-1 max-w-2xl text-sm text-ink-muted">
          Borrados con soft delete: no pueden vender ni salen en las listas, y su email sigue reservado.
          Restáuralos como activos o como inactivos.
        </p>
      </header>

      <app-admin-tabs label="Secciones de usuarios" [tabs]="tabs()" />

      @if (trash.loading() && !trash.loaded()) {
        <app-skeleton variant="table" [count]="3" label="Cargando papelera…" />
      } @else if (trash.error()) {
        <app-error-state title="No hemos podido cargar la papelera" [error]="trash.error()" (retry)="retry()" />
      } @else if (trash.items().length === 0) {
        <app-empty-state icon="trash" title="La papelera está vacía" message="Cuando borres un usuario aparecerá aquí y podrás recuperarlo.">
          <a routerLink="/admin/users" class="btn btn-secondary">Ir a usuarios</a>
        </app-empty-state>
      } @else {
        <ul class="space-y-3" aria-label="Usuarios en la papelera">
          @for (user of trash.items(); track user._id) {
            <li @rowLeave class="retired rounded-2xl border border-slate-400 bg-surface p-4 sm:p-5">
              <div class="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div class="flex min-w-0 flex-1 items-center gap-3">
                  <span class="retired-dim grid size-10 shrink-0 place-items-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600" aria-hidden="true">
                    {{ initials(user.name) }}
                  </span>
                  <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-2">
                      <p class="font-medium text-ink">{{ user.name }}</p>
                      <span class="retired-tag text-slate-600">
                        <app-icon name="trash" [size]="12" />
                        En papelera
                      </span>
                    </div>
                    <p class="mt-1 truncate text-sm text-ink-muted">{{ user.email }} · {{ user.role?.name ?? 'Sin rol' }}</p>
                    <p class="mt-1 text-xs font-medium text-slate-700">
                      Eliminado
                      <time [attr.datetime]="user.deletedAt" [title]="user.deletedAt | date: 'd MMMM y, HH:mm'">{{ user.deletedAt | relativeTime }}</time>
                    </p>
                  </div>
                </div>

                <div class="flex flex-wrap gap-2 sm:justify-end">
                  <button type="button" class="btn btn-primary min-h-9 px-3" [disabled]="store.pendingIds().has(user._id)" (click)="restore(user, true)">
                    <app-icon name="restore" [size]="17" />
                    Restaurar como activo
                  </button>
                  <button type="button" class="btn btn-secondary min-h-9 px-3" [disabled]="store.pendingIds().has(user._id)" (click)="restore(user, false)">
                    Como inactivo
                  </button>
                </div>
              </div>
            </li>
          }
        </ul>
        <p class="mt-4 text-xs text-ink-muted">No hay borrado definitivo: la API solo permite restaurar.</p>
      }
    </div>
  `,
})
export class AdminUsersTrashPageComponent implements OnInit {
  protected readonly store = inject(UsersStore);
  private readonly alert = inject(AlertService);

  protected readonly trash = this.store.collection('trash');
  protected readonly tabs = computed(() => sectionTabs('/admin/users', this.store.counts()));
  protected readonly initials = initials;
  protected readonly reducedMotion = prefersReducedMotion();

  ngOnInit(): void {
    void this.store.loadCollections();
  }

  protected retry(): void {
    void this.store.loadCollection('trash', { force: true });
  }

  protected async restore(user: User, isActive: boolean): Promise<void> {
    try {
      await this.store.restore(user, isActive);
      void this.alert.success(`"${user.name}" restaurado como ${isActive ? 'activo' : 'inactivo'}`);
    } catch (error) {
      if (error instanceof ApiError && error.isConflict) {
        void this.alert.error(error.message);
        this.retry();
      }
    }
  }
}
