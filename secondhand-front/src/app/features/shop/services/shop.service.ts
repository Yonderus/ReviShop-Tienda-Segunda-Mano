import { Injectable, inject } from '@angular/core';
import { ApiService, QueryValue } from '../../../core/services/api.service';
import { READ_OPTIONS } from '../../../core/services/entity-api.service';
import { Product } from '../../products/models/product.model';
import { ProductVariant } from '../../products/models/product-variant.model';
import { SHOP_PAGE_SIZE, ShopCategory, ShopFilters, ShopLocation, ShopPage, ShopSeller } from '../models/shop.model';

/** De los filtros a los query params de la API (`ApiService` une las listas con comas y quita los vacíos). */
export function toApiParams(filters: ShopFilters): Record<string, QueryValue> {
  return {
    category: filters.category,
    seller: filters.seller,
    location: filters.location,
    condition: filters.condition,
    status: filters.status,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    search: filters.search,
    sort: filters.sort,
    page: filters.page,
    limit: SHOP_PAGE_SIZE,
  };
}

/**
 * La tienda pública (`/api/shop`): los 6 endpoints. Todo son lecturas que pinta cada pantalla con sus propios
 * estados de carga y error (sin modal ni loader global).
 */
@Injectable({ providedIn: 'root' })
export class ShopService {
  private readonly api = inject(ApiService);

  categories(): Promise<ShopCategory[]> {
    return this.api.get<ShopCategory[]>('/shop/categories', READ_OPTIONS);
  }

  sellers(): Promise<ShopSeller[]> {
    return this.api.get<ShopSeller[]>('/shop/sellers', READ_OPTIONS);
  }

  locations(): Promise<ShopLocation[]> {
    return this.api.get<ShopLocation[]>('/shop/locations', READ_OPTIONS);
  }

  /** El listado con sus filtros. Con `signal` se puede cancelar (una petición nueva aborta la anterior). */
  products(filters: ShopFilters, signal?: AbortSignal): Promise<ShopPage<Product>> {
    return this.api.get<ShopPage<Product>>('/shop/products', { ...READ_OPTIONS, params: toApiParams(filters), signal });
  }

  product(slug: string): Promise<Product> {
    return this.api.get<Product>(`/shop/products/${encodeURIComponent(slug)}`, READ_OPTIONS);
  }

  variants(slug: string): Promise<ProductVariant[]> {
    return this.api.get<ProductVariant[]>(`/shop/products/${encodeURIComponent(slug)}/variants`, READ_OPTIONS);
  }
}
