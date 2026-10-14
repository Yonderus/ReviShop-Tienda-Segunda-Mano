import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ApiError } from '../../../../core/models/api-error.model';
import { NotificationService } from '../../../../core/services/notification.service';
import { ProductFormComponent } from '../../components/product-form/product-form.component';
import { ProductInput } from '../../models/product.model';
import { ProductsStore } from '../../store/products.store';
import { INLINE_FORM_STATUSES } from '../../services/products.service';

@Component({
  selector: 'app-product-create-page',
  standalone: true,
  imports: [RouterLink, ProductFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container-page max-w-3xl py-6 sm:py-10">
      <nav aria-label="Ruta de navegación" class="mb-4 text-sm text-ink-muted">
        <a routerLink="/" class="hover:text-primary-700 hover:underline">Catálogo</a>
        <span aria-hidden="true"> / </span>
        <span class="font-medium text-ink" aria-current="page">Publicar</span>
      </nav>
      <h1 class="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Publicar producto</h1>
      <p class="mt-2 text-[0.9375rem] text-ink-muted">Cuéntalo bien y encontrará antes su segunda vida.</p>

      <div class="mt-8">
        <app-product-form [saving]="store.saving()" [serverError]="serverError()" (submitted)="create($event)" />
      </div>
    </div>
  `,
})
export class ProductCreatePageComponent {
  protected readonly store = inject(ProductsStore);
  private readonly router = inject(Router);
  private readonly notification = inject(NotificationService);

  protected readonly serverError = signal<ApiError | null>(null);

  protected async create(input: ProductInput): Promise<void> {
    this.serverError.set(null);
    try {
      const product = await this.store.create(input);
      void this.notification.success('Producto publicado');
      void this.router.navigate(['/products', product.slug]);
    } catch (error) {
      if (error instanceof ApiError && INLINE_FORM_STATUSES.includes(error.status)) this.serverError.set(error);
    }
  }
}
