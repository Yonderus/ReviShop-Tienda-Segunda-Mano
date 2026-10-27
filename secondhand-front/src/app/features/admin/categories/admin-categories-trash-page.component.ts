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
import { AdminCategory } from '../../catalog/models/category.model';
import { CategoriesStore } from '../../catalog/store/categories.store';
import { prefersReducedMotion, rowLeave } from '../admin.animations';
import { AdminTabsComponent, sectionTabs } from '../components/admin-tabs/admin-tabs.component';

@Component({
  selector: 'app-admin-categories-trash-page',
  standalone: true,
  imports: [RouterLink, DatePipe, RelativeTimePipe, IconComponent, SkeletonComponent, EmptyStateComponent, ErrorStateComponent, AdminTabsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [rowLeave],
  template: `
    <div class="mx-auto max-w-6xl" [@.disabled]="reducedMotion">
      <header class="mb-5">
        <h1 class="text-2xl font-semibold tracking-tight text-ink">Categorías</h1>
        <p class="mt-1 max-w-2xl text-sm text-ink-muted">
          Borradas con soft delete: no salen en la tienda ni en las listas y su nombre sigue reservado.
          Una subcategoría solo se puede restaurar si su categoría padre no está aquí.
        </p>
      </header>

      <app-admin-tabs label="Secciones de categorías" [tabs]="tabs()" />

      @if (trash.loading() && !trash.loaded()) {
        <app-skeleton variant="table" [count]="4" label="Cargando papelera…" />
      } @else if (trash.error()) {
        <app-error-state title="No hemos podido cargar la papelera" [error]="trash.error()" (retry)="retry()" />
      } @else if (trash.items().length === 0) {
        <app-empty-state icon="trash" title="La papelera está vacía" message="Cuando borres una categoría aparecerá aquí y podrás recuperarla.">
          <a routerLink="/admin/categories" class="btn btn-secondary">Ir a categorías</a>
        </app-empty-state>
      } @else {
        <ul class="space-y-3" aria-label="Categorías en la papelera">
          @for (category of trash.items(); track category._id) {
            <li @rowLeave class="retired rounded-2xl border border-slate-400 bg-surface p-4 sm:p-5">
              <div class="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <p class="font-medium text-ink">{{ category.name }}</p>
                    <span class="retired-tag text-slate-600">
                      <app-icon name="trash" [size]="12" />
                      En papelera
                    </span>
                  </div>
                  <p class="mt-1 text-sm text-ink-muted">
                    <span class="font-mono">/{{ category.slug }}</span>
                    @if (category.parentId) {
                      · subcategoría de {{ parentName(category) }}
                    }
                  </p>
                  <p class="mt-1 text-xs font-medium text-slate-700">
                    Eliminada
                    <time [attr.datetime]="category.deletedAt" [title]="category.deletedAt | date: 'd MMMM y, HH:mm'">
                      {{ category.deletedAt | relativeTime }}
                    </time>
                  </p>
                </div>

                <div class="flex flex-wrap gap-2 sm:justify-end">
                  <button type="button" class="btn btn-primary min-h-9 px-3" [disabled]="store.pendingIds().has(category._id)" (click)="restore(category, true)">
                    <app-icon name="restore" [size]="17" />
                    Restaurar como activa
                  </button>
                  <button type="button" class="btn btn-secondary min-h-9 px-3" [disabled]="store.pendingIds().has(category._id)" (click)="restore(category, false)">
                    Como inactiva
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
export class AdminCategoriesTrashPageComponent implements OnInit {
  protected readonly store = inject(CategoriesStore);
  private readonly alert = inject(AlertService);

  protected readonly trash = this.store.collection('trash');
  protected readonly tabs = computed(() => sectionTabs('/admin/categories', this.store.counts()));
  protected readonly reducedMotion = prefersReducedMotion();

  ngOnInit(): void {
    void this.store.loadCollections();
  }

  protected parentName(category: AdminCategory): string {
    return this.store.namesById().get(category.parentId!) ?? 'otra categoría';
  }

  protected retry(): void {
    void this.store.loadCollection('trash', { force: true });
  }

  protected async restore(category: AdminCategory, isActive: boolean): Promise<void> {
    try {
      await this.store.restore(category, isActive);
      void this.alert.success(`"${category.name}" restaurada como ${isActive ? 'activa' : 'inactiva'}`);
    } catch (error) {
      // 409: ya no estaba en la papelera, o su padre sigue en ella. El mensaje de la API dice cuál.
      if (error instanceof ApiError && error.isConflict) {
        void this.alert.error(error.message);
        void this.store.loadCollections({ force: true });
      }
    }
  }
}
