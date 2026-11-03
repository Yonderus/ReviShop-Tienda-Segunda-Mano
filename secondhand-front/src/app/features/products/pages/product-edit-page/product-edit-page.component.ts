import { ChangeDetectionStrategy, Component, OnChanges, OnDestroy, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthStore } from '../../../../core/auth/auth.store';
import { ApiError } from '../../../../core/models/api-error.model';
import { AlertService } from '../../../../core/services/alert.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { PageNotFoundComponent } from '../../../../shared/components/page-not-found/page-not-found.component';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { ProductFormComponent } from '../../components/product-form/product-form.component';
import { Product, ProductInput } from '../../models/product.model';
import { ProductsStore } from '../../store/products.store';
import { diffProduct, sellerIdOf } from '../../models/product.utils';
import { INLINE_FORM_STATUSES } from '../../../../core/config/app.constants';

@Component({
  selector: 'app-product-edit-page',
  standalone: true,
  imports: [RouterLink, ProductFormComponent, SkeletonComponent, EmptyStateComponent, ErrorStateComponent, PageNotFoundComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (store.detailStatus()) {
      @case ('not-found') {
        <app-page-not-found title="Producto no encontrado" message="No podemos editar un anuncio que no existe o que ya se ha retirado." />
      }
      @case ('error') {
        <div class="container-page">
          <app-error-state title="No hemos podido cargar el anuncio" [error]="store.detailError()" (retry)="load()" />
        </div>
      }
      @default {
        <div class="container-page max-w-3xl py-6 sm:py-10">
          @if (store.selectedComplete(); as product) {
            @if (!canManage()) {
              <!-- Lo abre a mano quien no es su vendedor: la API lo rechazaría al guardar (403). -->
              <app-empty-state icon="lock" title="No puedes editar este anuncio" message="Solo su vendedor o un administrador pueden cambiarlo.">
                <a [routerLink]="['/products', product.slug]" class="btn btn-primary">Ver el anuncio</a>
              </app-empty-state>
            } @else {
              <nav aria-label="Ruta de navegación" class="mb-4 text-sm text-ink-muted">
                <a routerLink="/" class="hover:text-primary-700 hover:underline">Catálogo</a>
                <span aria-hidden="true"> / </span>
                <a [routerLink]="['/products', product.slug]" class="hover:text-primary-700 hover:underline">{{ product.title }}</a>
                <span aria-hidden="true"> / </span>
                <span class="font-medium text-ink" aria-current="page">Editar</span>
              </nav>
              <h1 class="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Editar anuncio</h1>
              <p class="mt-2 text-[0.9375rem] text-ink-muted">Solo se guardan los campos que cambies.</p>

              <div class="mt-8">
                <app-product-form
                  [product]="product"
                  [saving]="store.saving()"
                  [serverError]="serverError()"
                  [cancelLink]="'/products/' + product.slug"
                  (submitted)="save(product, $event)"
                />
              </div>
            }
          } @else {
            <app-skeleton variant="detail" label="Cargando anuncio…" />
          }
        </div>
      }
    }
  `,
})
export class ProductEditPageComponent implements OnChanges, OnDestroy {
  protected readonly store = inject(ProductsStore);
  private readonly router = inject(Router);
  private readonly alert = inject(AlertService);
  private readonly auth = inject(AuthStore);

  readonly slug = input.required<string>();
  protected readonly serverError = signal<ApiError | null>(null);
  protected readonly canManage = computed(() => {
    const product = this.store.selectedComplete();
    return !!product && this.auth.isOwnerOrAdmin(sellerIdOf(product));
  });

  ngOnChanges(): void {
    void this.load();
  }

  ngOnDestroy(): void {
    this.store.clearSelected();
  }

  protected async load(): Promise<void> {
    await this.store.loadBySlug(this.slug());
  }

  protected async save(product: Product, input: ProductInput): Promise<void> {
    this.serverError.set(null);
    const changes = diffProduct(product, input);
    if (Object.keys(changes).length === 0) {
      void this.alert.success('No había cambios que guardar');
      void this.router.navigate(['/products', product.slug]);
      return;
    }

    try {
      const updated = await this.store.update(product, changes);
      void this.alert.success('Cambios guardados');
      void this.router.navigate(['/products', updated.slug], { replaceUrl: true });
    } catch (error) {
      if (error instanceof ApiError && INLINE_FORM_STATUSES.includes(error.status)) this.serverError.set(error);
    }
  }
}
