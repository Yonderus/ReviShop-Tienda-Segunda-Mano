import { ChangeDetectionStrategy, Component, OnChanges, OnDestroy, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ApiError } from '../../../core/models/api-error.model';
import { AlertService } from '../../../core/services/alert.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { BadgeComponent } from '../../../shared/ui/badge.component';
import { ProductFormComponent } from '../../products/components/product-form/product-form.component';
import { Product, ProductInput } from '../../products/models/product.model';
import { diffProduct } from '../../products/models/product.utils';
import { INLINE_FORM_STATUSES } from '../../../core/config/app.constants';
import { ProductsStore } from '../../products/store/products.store';

@Component({
  selector: 'app-admin-product-edit-page',
  standalone: true,
  imports: [RouterLink, ProductFormComponent, SkeletonComponent, ErrorStateComponent, EmptyStateComponent, BadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto max-w-3xl">
      @switch (store.detailStatus()) {
        @case ('not-found') {
          <app-empty-state
            icon="search"
            title="Producto no encontrado"
            message="No existe o está en la papelera. Los productos de la papelera hay que restaurarlos antes de editarlos."
          >
            <a routerLink="/admin/products/trash" class="btn btn-secondary">Ir a la papelera</a>
            <a routerLink="/admin/products" class="btn btn-primary">Volver a productos</a>
          </app-empty-state>
        }
        @case ('error') {
          <app-error-state title="No hemos podido cargar el producto" [error]="store.detailError()" (retry)="load()" />
        }
        @default {
          @if (store.selected(); as product) {
            <div class="flex flex-wrap items-center gap-3">
              <h1 class="text-2xl font-semibold tracking-tight text-ink">Editar producto</h1>
              <app-badge [tone]="product.isActive ? 'success' : 'neutral'">{{ product.isActive ? 'Activo' : 'Inactivo' }}</app-badge>
            </div>
            <p class="mt-1 text-sm text-ink-muted">Solo se guardan los campos que cambies. La visibilidad se cambia desde la lista.</p>
            <div class="mt-6">
              <app-product-form
                [product]="product"
                [saving]="store.saving()"
                [serverError]="serverError()"
                [cancelLink]="listLink(product)"
                (submitted)="save(product, $event)"
              />
            </div>
          } @else {
            <app-skeleton variant="form" [count]="5" label="Cargando producto…" />
          }
        }
      }
    </div>
  `,
})
export class AdminProductEditPageComponent implements OnChanges, OnDestroy {
  protected readonly store = inject(ProductsStore);
  private readonly router = inject(Router);
  private readonly alert = inject(AlertService);

  readonly slug = input.required<string>();
  protected readonly serverError = signal<ApiError | null>(null);

  ngOnChanges(): void {
    void this.load();
  }

  ngOnDestroy(): void {
    this.store.clearSelected();
  }

  protected async load(): Promise<void> {
    await this.store.loadBySlug(this.slug());
  }

  protected listLink(product: Product): string {
    return product.isActive ? '/admin/products' : '/admin/products/inactive';
  }

  protected async save(product: Product, input: ProductInput): Promise<void> {
    this.serverError.set(null);
    const changes = diffProduct(product, input);
    if (Object.keys(changes).length === 0) {
      void this.alert.success('No había cambios que guardar');
      void this.router.navigateByUrl(this.listLink(product));
      return;
    }

    try {
      const updated = await this.store.update(product, changes);
      void this.alert.success('Cambios guardados');
      void this.router.navigateByUrl(this.listLink(updated));
    } catch (error) {
      if (error instanceof ApiError && INLINE_FORM_STATUSES.includes(error.status)) this.serverError.set(error);
    }
  }
}
