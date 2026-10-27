import { Injectable, inject } from '@angular/core';
import { INLINE_FORM_STATUSES } from '../../../core/config/app.constants';
import { ApiRequestOptions, ApiService } from '../../../core/services/api.service';
import { ProductVariant, VariantInput } from '../models/product-variant.model';
import { ProductStatus } from '../models/product.model';

/** Crear y editar pintan sus errores en el propio editor; el resto los muestra el errorInterceptor. */
const FORM_OPTIONS: ApiRequestOptions = { inlineErrorStatuses: INLINE_FORM_STATUSES, blocking: true };

@Injectable({ providedIn: 'root' })
export class VariantsService {
  private readonly api = inject(ApiService);

  create(productId: string, input: VariantInput): Promise<ProductVariant> {
    return this.api.post<ProductVariant>(`/products/${productId}/variants`, input, FORM_OPTIONS);
  }

  update(id: string, changes: Pick<VariantInput, 'price' | 'stock'>): Promise<ProductVariant> {
    return this.api.patch<ProductVariant>(`/variants/${id}`, changes, FORM_OPTIONS);
  }

  changeStatus(id: string, status: ProductStatus): Promise<ProductVariant> {
    return this.api.patch<ProductVariant>(`/variants/${id}/status`, { status });
  }

  setActive(id: string, isActive: boolean): Promise<ProductVariant> {
    return this.api.patch<ProductVariant>(`/variants/${id}/active`, { isActive });
  }

  remove(id: string): Promise<void> {
    return this.api.delete(`/variants/${id}`, { blocking: true });
  }
}
