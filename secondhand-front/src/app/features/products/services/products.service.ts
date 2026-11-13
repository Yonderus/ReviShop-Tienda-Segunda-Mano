import { Injectable } from '@angular/core';
import { EntityApiService } from '../../../core/services/entity-api.service';
import { Product, ProductInput, ProductStatus } from '../models/product.model';

/** 422 de changeStatus: el producto tiene varias variantes. */
export const STATUS_BY_VARIANT_STATUS = 422;

/** Los endpoints comunes vienen de EntityApiService; aquí solo los propios de productos. */
@Injectable({ providedIn: 'root' })
export class ProductsService extends EntityApiService<Product, ProductInput> {
  protected readonly path = '/products';

  /** No bloqueante: la UI ya ha aplicado el cambio de forma optimista. */
  changeStatus(id: string, status: ProductStatus): Promise<Product> {
    return this.api.patch<Product>(`${this.path}/${id}/status`, { status }, { inlineErrorStatuses: [STATUS_BY_VARIANT_STATUS] });
  }
}
