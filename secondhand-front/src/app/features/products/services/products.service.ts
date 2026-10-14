import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiRequestOptions, ApiService } from '../../../core/services/api.service';
import { Product, ProductInput, ProductUpdate } from '../models/product.model';

/** Las cargas pintan skeleton y ErrorState propios: sin loader global ni modal. */
const READ_OPTIONS: ApiRequestOptions = { skipErrorAlert: true, skipGlobalLoader: true };

/** Errores que el formulario pinta en línea; el resto los muestra el errorInterceptor en un modal. */
export const INLINE_FORM_STATUSES: readonly number[] = [400, 409, 422];

const FORM_OPTIONS: ApiRequestOptions = { inlineErrorStatuses: INLINE_FORM_STATUSES, blocking: true };

/** 409 de estado (activar uno eliminado, restaurar uno vivo): el llamador muestra un mensaje específico. */
export const STATE_CONFLICT_STATUS = 409;

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private readonly api = inject(ApiService);

  list(): Observable<Product[]> {
    return this.api.get<Product[]>('/products', READ_OPTIONS);
  }

  listInactive(): Observable<Product[]> {
    return this.api.get<Product[]>('/products/inactives', READ_OPTIONS);
  }

  listTrashed(): Observable<Product[]> {
    return this.api.get<Product[]>('/products/trash', READ_OPTIONS);
  }

  /** No bloqueante: la UI ya ha aplicado el cambio de forma optimista. */
  setActive(id: string, isActive: boolean): Observable<Product> {
    return this.api.patch<Product>(`/products/${id}/active`, { isActive }, { inlineErrorStatuses: [STATE_CONFLICT_STATUS] });
  }

  restore(id: string, isActive: boolean): Observable<Product> {
    return this.api.patch<Product>(
      `/products/${id}/restore`,
      { isActive },
      { inlineErrorStatuses: [STATE_CONFLICT_STATUS], blocking: true },
    );
  }

  getBySlug(slug: string): Observable<Product> {
    return this.api.get<Product>(`/products/slug/${encodeURIComponent(slug)}`, READ_OPTIONS);
  }

  create(input: ProductInput): Observable<Product> {
    return this.api.post<Product>('/products', input, FORM_OPTIONS);
  }

  update(id: string, changes: ProductUpdate): Observable<Product> {
    return this.api.patch<Product>(`/products/${id}`, changes, FORM_OPTIONS);
  }

  remove(id: string): Observable<void> {
    return this.api.delete(`/products/${id}`, { blocking: true });
  }
}
