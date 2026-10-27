import { ChangeDetectionStrategy, Component, OnChanges, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiError } from '../../../core/models/api-error.model';
import { AlertService } from '../../../core/services/alert.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { BadgeComponent } from '../../../shared/ui/badge.component';
import { IconComponent } from '../../../shared/ui/icon.component';
import { ToggleSwitchComponent } from '../../../shared/ui/toggle-switch.component';
import { ROLE_TONES } from '../../users/models/role.model';
import { USER_STATUSES, USER_STATUS_LABELS, USER_STATUS_TONES, User, UserStatus } from '../../users/models/user.model';
import { initials } from '../../users/models/user.utils';
import { UsersStore } from '../../users/store/users.store';
import { prefersReducedMotion, rowLeave } from '../admin.animations';
import { AdminTabsComponent, sectionTabs } from '../components/admin-tabs/admin-tabs.component';

export type UsersView = 'active' | 'inactive';

@Component({
  selector: 'app-admin-users-page',
  standalone: true,
  imports: [
    RouterLink,
    BadgeComponent,
    IconComponent,
    ToggleSwitchComponent,
    SkeletonComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    AdminTabsComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [rowLeave],
  template: `
    <div class="mx-auto max-w-6xl" [@.disabled]="reducedMotion">
      <header class="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 class="text-2xl font-semibold tracking-tight text-ink">Usuarios</h1>
          <p class="mt-1 text-sm text-ink-muted">
            {{ isActiveView() ? 'Cualquier usuario activo y no suspendido puede vender.' : 'Cuentas desactivadas: no pueden vender. Sus productos se quedan.' }}
          </p>
        </div>
        <a routerLink="/admin/users/new" class="btn btn-primary">
          <app-icon name="plus" [size]="18" />
          Nuevo usuario
        </a>
      </header>

      <app-admin-tabs label="Secciones de usuarios" [tabs]="tabs()" />

      @if (list().loading() && !list().loaded()) {
        <app-skeleton variant="table" [count]="5" label="Cargando usuarios…" />
      } @else if (list().error()) {
        <app-error-state title="No hemos podido cargar los usuarios" [error]="list().error()" (retry)="retry()" />
      } @else if (list().items().length === 0) {
        @if (isActiveView()) {
          <app-empty-state icon="users" title="No hay usuarios activos" message="Crea uno o activa uno de la pestaña Inactivos.">
            <a routerLink="/admin/users/new" class="btn btn-primary">
              <app-icon name="plus" [size]="18" />
              Nuevo usuario
            </a>
          </app-empty-state>
        } @else {
          <app-empty-state icon="eyeOff" title="No hay usuarios inactivos" message="Desactiva un usuario para que no pueda vender sin borrarlo." />
        }
      } @else {
        <div class="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <div class="flex items-center gap-2">
            <label for="usr-status-filter" class="text-sm font-medium text-ink">Estado</label>
            <select id="usr-status-filter" class="field-control w-auto min-w-36 py-2 text-sm" (change)="statusFilter.set($any($event.target).value)">
              <option value="" [selected]="!statusFilter()">Todos</option>
              @for (s of statuses; track s) {
                <option [value]="s" [selected]="statusFilter() === s">{{ statusLabels[s] }}</option>
              }
            </select>
          </div>
          <div class="flex items-center gap-2">
            <label for="usr-role-filter" class="text-sm font-medium text-ink">Rol</label>
            <select id="usr-role-filter" class="field-control w-auto min-w-36 py-2 text-sm" (change)="roleFilter.set($any($event.target).value)">
              <option value="" [selected]="!roleFilter()">Todos</option>
              @for (role of roleOptions(); track role.slug) {
                <option [value]="role.slug" [selected]="roleFilter() === role.slug">{{ role.name }}</option>
              }
            </select>
          </div>
          <span class="text-sm tabular-nums text-ink-muted" aria-live="polite">{{ rows().length }} de {{ list().items().length }}</span>
        </div>

        @if (rows().length === 0) {
          <app-empty-state icon="search" title="Ningún usuario con esos filtros" message="Cambia el estado o el rol para ver el resto." />
        } @else {
          <ul class="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface shadow-card" [attr.aria-label]="isActiveView() ? 'Usuarios activos' : 'Usuarios inactivos'">
            @for (user of rows(); track user._id) {
              <li @rowLeave class="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 transition-colors duration-150 hover:bg-canvas/60 sm:px-5">
                <!-- En móvil, nombre y email ocupan su propia fila; en escritorio, al menos 14rem. -->
                <div class="flex min-w-0 basis-full items-center gap-3 sm:min-w-[14rem] sm:flex-1 sm:basis-0">
                  <span class="grid size-10 shrink-0 place-items-center rounded-full bg-primary-50 text-sm font-semibold text-primary-700" aria-hidden="true">
                    {{ initials(user.name) }}
                  </span>
                  <div class="min-w-0">
                    <a [routerLink]="['/admin/users', user.slug, 'edit']" class="block truncate font-medium text-ink hover:text-primary-700 hover:underline">{{ user.name }}</a>
                    <p class="truncate text-xs text-ink-muted">{{ user.email }}{{ user.location ? ' · ' + user.location : '' }}</p>
                  </div>
                </div>

                <div class="flex flex-wrap items-center gap-2">
                  <app-badge [tone]="roleTone(user)">{{ user.role?.name ?? 'Sin rol' }}</app-badge>
                  <app-badge [tone]="statusTones[user.status]">{{ statusLabels[user.status] }}</app-badge>
                </div>

                <dl class="w-20 text-center text-xs text-ink-muted">
                  <dt>Productos</dt>
                  <dd class="text-sm font-semibold tabular-nums text-ink">{{ user.productsCount }}</dd>
                </dl>

                <div class="flex items-center gap-1 [&_.toggle-text]:hidden lg:[&_.toggle-text]:inline">
                  <app-toggle-switch
                    [checked]="user.isActive"
                    [busy]="store.pendingIds().has(user._id)"
                    [label]="'Cuenta activa: ' + user.name"
                    (toggled)="toggle(user, $event)"
                  />
                  <a [routerLink]="['/admin/users', user.slug, 'edit']" class="icon-btn" [attr.aria-label]="'Editar ' + user.name" title="Editar">
                    <app-icon name="pencil" [size]="18" />
                  </a>
                  <button
                    type="button"
                    class="icon-btn hover:!bg-red-50 hover:!text-red-700"
                    [attr.aria-label]="'Mover a la papelera ' + user.name"
                    [title]="user.productsCount ? 'Tiene productos: desactívalo o suspéndelo' : 'Mover a la papelera'"
                    [disabled]="store.deletingId() === user._id"
                    (click)="remove(user)"
                  >
                    <app-icon name="trash" [size]="18" />
                  </button>
                </div>
              </li>
            }
          </ul>
        }
      }
    </div>
  `,
})
export class AdminUsersPageComponent implements OnChanges {
  protected readonly store = inject(UsersStore);
  private readonly alert = inject(AlertService);

  /** Viene de `data.view` de la ruta gracias a withComponentInputBinding. */
  readonly view = input<UsersView>('active');

  protected readonly statuses = USER_STATUSES;
  protected readonly statusLabels = USER_STATUS_LABELS;
  protected readonly statusTones = USER_STATUS_TONES;
  protected readonly initials = initials;
  protected readonly reducedMotion = prefersReducedMotion();

  protected readonly statusFilter = signal<UserStatus | ''>('');
  protected readonly roleFilter = signal('');

  protected readonly isActiveView = computed(() => this.view() !== 'inactive');
  protected readonly list = computed(() => this.store.collection(this.isActiveView() ? 'active' : 'inactive'));
  protected readonly tabs = computed(() => sectionTabs('/admin/users', this.store.counts()));

  /** Los roles que aparecen en la lista (también uno ya retirado que alguien conserve). */
  protected readonly roleOptions = computed(() => {
    const roles = new Map(this.list().items().flatMap((u) => (u.role ? [[u.role.slug, u.role] as const] : [])));
    return [...roles.values()].sort((a, b) => a.name.localeCompare(b.name, 'es'));
  });

  protected readonly rows = computed(() => {
    const status = this.statusFilter();
    const role = this.roleFilter();
    return this.list()
      .items()
      .filter((u) => (!status || u.status === status) && (!role || u.role?.slug === role))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  });

  ngOnChanges(): void {
    void this.store.loadCollections();
  }

  protected roleTone(user: User) {
    return (user.role && ROLE_TONES[user.role.slug]) || 'neutral';
  }

  protected retry(): void {
    void this.store.loadCollection(this.isActiveView() ? 'active' : 'inactive', { force: true });
  }

  protected async toggle(user: User, isActive: boolean): Promise<void> {
    try {
      await this.store.setActive(user, isActive);
      void this.alert.success(isActive ? `"${user.name}" vuelve a estar activo` : `"${user.name}" pasa a Inactivos`);
    } catch (error) {
      // 409: el último admin, o un usuario que ya está en la papelera. El mensaje de la API dice cuál.
      if (error instanceof ApiError && error.isConflict) {
        void this.alert.error(error.message);
        void this.store.loadCollections({ force: true });
      }
    }
  }

  protected async remove(user: User): Promise<void> {
    // La API también lo comprueba (409); así no se pide una confirmación que luego va a fallar.
    if (user.productsCount) {
      void this.alert.error(`No se puede eliminar a "${user.name}": tiene ${user.productsCount} ${user.productsCount === 1 ? 'producto' : 'productos'}.`, [
        'Desactívalo o suspéndelo si no quieres que siga vendiendo.',
      ]);
      return;
    }

    const confirmed = await this.alert.confirm({
      title: '¿Mover a la papelera?',
      text: `"${user.name}" no podrá vender ni aparecerá en el panel. Podrás restaurarlo desde la Papelera; su email sigue reservado.`,
      confirmText: 'Mover a la papelera',
      danger: true,
    });
    if (!confirmed) return;

    try {
      await this.store.remove(user);
      void this.alert.success('Movido a la papelera');
    } catch {
      // El errorInterceptor ya ha mostrado el aviso (p. ej. el 409 del último admin).
    }
  }
}
