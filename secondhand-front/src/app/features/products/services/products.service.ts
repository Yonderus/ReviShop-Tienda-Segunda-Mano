import { Injectable, inject } from '@angular/core';
import { INLINE_FORM_STATUSES } from '../../../core/config/app.constants';
import { ApiRequestOptions, ApiService } from '../../../core/services/api.service';
import { Product, ProductInput, ProductStatus, ProductUpdate } from '../models/product.model';

/** Las cargas pintan skeleton y ErrorState propios: sin loader global ni modal. */
const READ_OPTIONS: ApiRequestOptions = { skipErrorAlert: true, skipGlobalLoader: true };

const FORM_OPTIONS: ApiRequestOptions = { inlineErrorStatuses: INLINE_FORM_STATUSES, blocking: true };

/** 409 de estado (activar uno eliminado, restaurar uno vivo): el llamador muestra un mensaje específico. */
export const STATE_CONFLICT_STATUS = 409;

/** 422 de changeStatus: el producto tiene varias variantes. */
export const STATUS_BY_VARIANT_STATUS = 422;

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private readonly api = inject(ApiService);

  list(): Promise<Product[]> {
    return this.api.get<Product[]>('/products', READ_OPTIONS);
  }

  listInactive(): Promise<Product[]> {
    return this.api.get<Product[]>('/products/inactives', READ_OPTIONS);
  }

  listTrashed(): Promise<Product[]> {
    return this.api.get<Product[]>('/products/trash', READ_OPTIONS);
  }

  getBySlug(slug: string): Promise<Product> {
    return this.api.get<Product>(`/products/slug/${encodeURIComponent(slug)}`, READ_OPTIONS);
  }

  create(input: ProductInput): Promise<Product> {
    return this.api.post<Product>('/products', input, FORM_OPTIONS);
  }

  update(id: string, changes: ProductUpdate): Promise<Product> {
    return this.api.patch<Product>(`/products/${id}`, changes, FORM_OPTIONS);
  }

  /** No bloqueante: la UI ya ha aplicado el cambio de forma optimista. */
  changeStatus(id: string, status: ProductStatus): Promise<Product> {
    return this.api.patch<Product>(`/products/${id}/status`, { status }, { inlineErrorStatuses: [STATUS_BY_VARIANT_STATUS] });
  }

  /** No bloqueante: la UI ya ha aplicado el cambio de forma optimista. */
  setActive(id: string, isActive: boolean): Promise<Product> {
    return this.api.patch<Product>(`/products/${id}/active`, { isActive }, { inlineErrorStatuses: [STATE_CONFLICT_STATUS] });
  }

  restore(id: string, isActive: boolean): Promise<Product> {
    return this.api.patch<Product>(
      `/products/${id}/restore`,
      { isActive },
      { inlineErrorStatuses: [STATE_CONFLICT_STATUS], blocking: true },
    );
  }

  remove(id: string): Promise<void> {
    return this.api.delete(`/products/${id}`, { blocking: true });
  }
}
