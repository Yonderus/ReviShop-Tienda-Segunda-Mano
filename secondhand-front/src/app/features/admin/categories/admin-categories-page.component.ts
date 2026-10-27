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
import {
  AdminCategory,
  CATEGORY_STATUSES,
  CATEGORY_STATUS_LABELS,
  CATEGORY_STATUS_TONES,
  CategoryStatus,
} from '../../catalog/models/category.model';
import { categoryTree, deleteBlockers } from '../../catalog/models/category.utils';
import { CategoriesStore } from '../../catalog/store/categories.store';
import { prefersReducedMotion, rowLeave } from '../admin.animations';
import { AdminTabsComponent, sectionTabs } from '../components/admin-tabs/admin-tabs.component';

export type CategoriesView = 'active' | 'inactive';

@Component({
  selector: 'app-admin-categories-page',
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
  styles: `
    @media (min-width: 640px) {
      .is-child {
        padding-left: 3rem;
      }
    }
  `,
  template: `
    <div class="mx-auto max-w-6xl" [@.disabled]="reducedMotion">
      <header class="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 class="text-2xl font-semibold tracking-tight text-ink">Categorías</h1>
          <p class="mt-1 text-sm text-ink-muted">
            {{ isActiveView() ? 'Las publicadas salen en la tienda; los borradores solo aquí.' : 'Ocultas de la tienda y sin productos nuevos. Los que ya tienen se quedan.' }}
          </p>
        </div>
        <a routerLink="/admin/categories/new" class="btn btn-primary">
          <app-icon name="plus" [size]="18" />
          Nueva categoría
        </a>
      </header>

      <app-admin-tabs label="Secciones de categorías" [tabs]="tabs()" />

      @if (list().loading() && !list().loaded()) {
        <app-skeleton variant="table" [count]="6" label="Cargando categorías…" />
      } @else if (list().error()) {
        <app-error-state title="No hemos podido cargar las categorías" [error]="list().error()" (retry)="retry()" />
      } @else if (list().items().length === 0) {
        @if (isActiveView()) {
          <app-empty-state icon="tag" title="No hay categorías activas" message="Crea una o activa una de la pestaña Inactivos.">
            <a routerLink="/admin/categories/new" class="btn btn-primary">
              <app-icon name="plus" [size]="18" />
              Nueva categoría
            </a>
          </app-empty-state>
        } @else {
          <app-empty-state icon="eyeOff" title="No hay categorías inactivas" message="Desactiva una categoría para ocultarla de la tienda sin borrarla." />
        }
      } @else {
        <div class="mb-4 flex flex-wrap items-center gap-3">
          <label for="cat-status-filter" class="text-sm font-medium text-ink">Estado</label>
          <select id="cat-status-filter" class="field-control w-auto min-w-40 py-2 text-sm" (change)="statusFilter.set($any($event.target).value)">
            <option value="" [selected]="!statusFilter()">Todos</option>
            @for (s of statuses; track s) {
              <option [value]="s" [selected]="statusFilter() === s">{{ statusLabels[s] }}</option>
            }
          </select>
          <span class="text-sm tabular-nums text-ink-muted" aria-live="polite">{{ rows().length }} de {{ list().items().length }}</span>
        </div>

        @if (rows().length === 0) {
          <app-empty-state icon="search" title="Ninguna categoría con ese estado" message="Cambia el filtro para ver el resto." />
        } @else {
          <ul class="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface shadow-card" [attr.aria-label]="isActiveView() ? 'Categorías activas' : 'Categorías inactivas'">
            @for (row of rows(); track row.category._id) {
              <li @rowLeave class="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 transition-colors duration-150 hover:bg-canvas/60 sm:px-5" [class.is-child]="row.depth === 1">
                <div class="flex min-w-0 flex-1 items-start gap-2">
                  @if (row.depth === 1) {
                    <span class="mt-0.5 text-ink-muted" aria-hidden="true">└</span>
                  }
                  <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-2">
                      <a
                        [routerLink]="['/admin/categories', row.category.slug, 'edit']"
                        class="font-medium text-ink hover:text-primary-700 hover:underline"
                      >{{ row.category.name }}</a>
                      <app-badge [tone]="statusTones[row.category.status]">{{ statusLabels[row.category.status] }}</app-badge>
                    </div>
                    <p class="mt-0.5 text-xs text-ink-muted">
                      <span class="font-mono">/{{ row.category.slug }}</span>
                      @if (row.orphanOf) {
                        · subcategoría de {{ row.orphanOf }}
                      }
                      @if (row.category.attributes.length) {
                        · {{ attributeLabels(row.category) }}
                      }
                    </p>
                  </div>
                </div>

                <dl class="flex gap-4 text-xs text-ink-muted">
                  <div class="text-center">
                    <dt>Productos</dt>
                    <dd class="text-sm font-semibold tabular-nums text-ink">{{ row.category.productsCount }}</dd>
                  </div>
                  <!-- Las subcategorías no tienen hijas: la columna se deja vacía para que las cifras queden alineadas. -->
                  <div class="text-center" [class.invisible]="row.depth === 1" [attr.aria-hidden]="row.depth === 1 || null">
                    <dt>Subcategorías</dt>
                    <dd class="text-sm font-semibold tabular-nums text-ink">{{ row.category.childrenCount }}</dd>
                  </div>
                </dl>

                <div class="flex items-center gap-1 [&_.toggle-text]:hidden lg:[&_.toggle-text]:inline">
                  <app-toggle-switch
                    [checked]="row.category.isActive"
                    [busy]="store.pendingIds().has(row.category._id)"
                    [label]="'Visible en la tienda: ' + row.category.name"
                    (toggled)="toggle(row.category, $event)"
                  />
                  <a [routerLink]="['/admin/categories', row.category.slug, 'edit']" class="icon-btn" [attr.aria-label]="'Editar ' + row.category.name" title="Editar">
                    <app-icon name="pencil" [size]="18" />
                  </a>
                  <button
                    type="button"
                    class="icon-btn hover:!bg-red-50 hover:!text-red-700"
                    [attr.aria-label]="'Mover a la papelera ' + row.category.name"
                    [title]="blockers(row.category) ? 'Tiene ' + blockers(row.category) : 'Mover a la papelera'"
                    [disabled]="store.deletingId() === row.category._id"
                    (click)="remove(row.category)"
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
export class AdminCategoriesPageComponent implements OnChanges {
  protected readonly store = inject(CategoriesStore);
  private readonly alert = inject(AlertService);

  /** Viene de `data.view` de la ruta gracias a withComponentInputBinding. */
  readonly view = input<CategoriesView>('active');

  protected readonly statuses = CATEGORY_STATUSES;
  protected readonly statusLabels = CATEGORY_STATUS_LABELS;
  protected readonly statusTones = CATEGORY_STATUS_TONES;
  protected readonly blockers = deleteBlockers;
  protected readonly reducedMotion = prefersReducedMotion();

  protected readonly statusFilter = signal<CategoryStatus | ''>('');

  protected readonly isActiveView = computed(() => this.view() !== 'inactive');
  protected readonly list = computed(() => this.store.collection(this.isActiveView() ? 'active' : 'inactive'));
  protected readonly tabs = computed(() => sectionTabs('/admin/categories', this.store.counts()));

  protected readonly rows = computed(() => {
    const status = this.statusFilter();
    const items = this.list().items();
    return categoryTree(status ? items.filter((c) => c.status === status) : items, this.store.namesById());
  });

  ngOnChanges(): void {
    void this.store.loadCollections();
  }

  protected attributeLabels(category: AdminCategory): string {
    return category.attributes.map((a) => a.label).join(', ');
  }

  protected retry(): void {
    void this.store.loadCollection(this.isActiveView() ? 'active' : 'inactive', { force: true });
  }

  protected async toggle(category: AdminCategory, isActive: boolean): Promise<void> {
    try {
      await this.store.setActive(category, isActive);
      void this.alert.success(isActive ? `"${category.name}" vuelve a estar activa` : `"${category.name}" pasa a Inactivos`);
    } catch (error) {
      if (error instanceof ApiError && error.isConflict) {
        void this.alert.error('Esta categoría está en la papelera. Restáurala antes de activarla.');
        void this.store.loadCollections({ force: true });
      }
    }
  }

  protected async remove(category: AdminCategory): Promise<void> {
    // La API también lo comprueba (409); así no se pide una confirmación que luego va a fallar.
    const blockers = deleteBlockers(category);
    if (blockers) {
      void this.alert.error(
        `No se puede eliminar "${category.name}": tiene ${blockers}.`,
        ['Muévelos a otra categoría o elimínalos antes. Si solo quieres ocultarla, desactívala.'],
      );
      return;
    }

    const confirmed = await this.alert.confirm({
      title: '¿Mover a la papelera?',
      text: `"${category.name}" dejará de verse en la tienda. Podrás restaurarla desde la Papelera cuando quieras.`,
      confirmText: 'Mover a la papelera',
      danger: true,
    });
    if (!confirmed) return;

    try {
      await this.store.remove(category);
      void this.alert.success('Movida a la papelera');
    } catch {
      // El errorInterceptor ya ha mostrado el aviso (p. ej. el 409 si alguien le ha añadido un producto).
    }
  }
}
