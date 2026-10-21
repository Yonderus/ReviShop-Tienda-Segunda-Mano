import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiError } from '../../../core/models/api-error.model';
import { AlertService } from '../../../core/services/alert.service';
import { ProductFormComponent } from '../../products/components/product-form/product-form.component';
import { ProductInput } from '../../products/models/product.model';
import { INLINE_FORM_STATUSES } from '../../products/services/products.service';
import { ProductsStore } from '../../products/store/products.store';

@Component({
  selector: 'app-admin-product-create-page',
  standalone: true,
  imports: [ProductFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto max-w-3xl">
      <h1 class="text-2xl font-semibold tracking-tight text-ink">Nuevo producto</h1>
      <p class="mt-1 text-sm text-ink-muted">Se publica como activo y aparece al momento en la tienda.</p>
      <div class="mt-6">
        <app-product-form [saving]="store.saving()" [serverError]="serverError()" cancelLink="/admin/products" (submitted)="create($event)" />
      </div>
    </div>
  `,
})
export class AdminProductCreatePageComponent {
  protected readonly store = inject(ProductsStore);
  private readonly router = inject(Router);
  private readonly alert = inject(AlertService);

  protected readonly serverError = signal<ApiError | null>(null);

  protected async create(input: ProductInput): Promise<void> {
    this.serverError.set(null);
    try {
      const product = await this.store.create(input);
      void this.alert.success(`"${product.title}" publicado`);
      void this.router.navigate(['/admin/products']);
    } catch (error) {
      if (error instanceof ApiError && INLINE_FORM_STATUSES.includes(error.status)) this.serverError.set(error);
    }
  }
}
