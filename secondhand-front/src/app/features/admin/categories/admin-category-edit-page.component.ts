import { ChangeDetectionStrategy, Component, OnChanges, OnDestroy, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { INLINE_FORM_STATUSES } from '../../../core/config/app.constants';
import { ApiError } from '../../../core/models/api-error.model';
import { AlertService } from '../../../core/services/alert.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { BadgeComponent } from '../../../shared/ui/badge.component';
import { AdminCategory, CATEGORY_STATUS_LABELS, CATEGORY_STATUS_TONES, CategoryInput } from '../../catalog/models/category.model';
import { diffCategory } from '../../catalog/models/category.utils';
import { CategoriesStore } from '../../catalog/store/categories.store';
import { CategoryFormComponent } from './category-form.component';

@Component({
  selector: 'app-admin-category-edit-page',
  standalone: true,
  imports: [RouterLink, CategoryFormComponent, SkeletonComponent, ErrorStateComponent, EmptyStateComponent, BadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto max-w-3xl">
      @switch (store.detailStatus()) {
        @case ('not-found') {
          <app-empty-state
            icon="search"
            title="Categoría no encontrada"
            message="No existe o está en la papelera. Las de la papelera hay que restaurarlas antes de editarlas."
          >
            <a routerLink="/admin/categories/trash" class="btn btn-secondary">Ir a la papelera</a>
            <a routerLink="/admin/categories" class="btn btn-primary">Volver a categorías</a>
          </app-empty-state>
        }
        @case ('error') {
          <app-error-state title="No hemos podido cargar la categoría" [error]="store.detailError()" (retry)="load()" />
        }
        @default {
          @if (store.selectedComplete(); as category) {
            <div class="flex flex-wrap items-center gap-3">
              <h1 class="text-2xl font-semibold tracking-tight text-ink">Editar categoría</h1>
              <app-badge [tone]="statusTones[category.status]">{{ statusLabels[category.status] }}</app-badge>
              <app-badge [tone]="category.isActive ? 'success' : 'neutral'">{{ category.isActive ? 'Activa' : 'Inactiva' }}</app-badge>
            </div>
            <p class="mt-1 text-sm text-ink-muted">
              {{ category.productsCount }} {{ category.productsCount === 1 ? 'producto' : 'productos' }}
              @if (!category.parentId) {
                · {{ category.childrenCount }} {{ category.childrenCount === 1 ? 'subcategoría' : 'subcategorías' }}
              }
              · Solo se guardan los campos que cambies. La visibilidad se cambia desde la lista.
            </p>
            <div class="mt-6">
              <app-category-form
                [category]="category"
                [categories]="store.liveCategories()"
                [saving]="store.saving()"
                [serverError]="serverError()"
                [cancelLink]="listLink(category)"
                (submitted)="save(category, $event)"
              />
            </div>
          } @else {
            <app-skeleton variant="form" [count]="4" label="Cargando categoría…" />
          }
        }
      }
    </div>
  `,
})
export class AdminCategoryEditPageComponent implements OnChanges, OnDestroy {
  protected readonly store = inject(CategoriesStore);
  private readonly router = inject(Router);
  private readonly alert = inject(AlertService);

  readonly slug = input.required<string>();
  protected readonly serverError = signal<ApiError | null>(null);
  protected readonly statusLabels = CATEGORY_STATUS_LABELS;
  protected readonly statusTones = CATEGORY_STATUS_TONES;

  ngOnChanges(): void {
    void this.load();
  }

  ngOnDestroy(): void {
    this.store.clearSelected();
  }

  protected async load(): Promise<void> {
    // Las colecciones, para el select de categoría padre.
    void this.store.loadCollections();
    await this.store.loadBySlug(this.slug());
  }

  protected listLink(category: AdminCategory): string {
    return category.isActive ? '/admin/categories' : '/admin/categories/inactive';
  }

  protected async save(category: AdminCategory, input: CategoryInput): Promise<void> {
    this.serverError.set(null);
    const changes = diffCategory(category, input);
    if (Object.keys(changes).length === 0) {
      void this.alert.success('No había cambios que guardar');
      void this.router.navigateByUrl(this.listLink(category));
      return;
    }

    try {
      const updated = await this.store.update(category, changes);
      void this.alert.success('Cambios guardados');
      void this.router.navigateByUrl(this.listLink(updated));
    } catch (error) {
      if (error instanceof ApiError && INLINE_FORM_STATUSES.includes(error.status)) this.serverError.set(error);
    }
  }
}
