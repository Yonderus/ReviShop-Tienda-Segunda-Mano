import type { Params } from '@angular/router';
import { PRODUCT_CONDITIONS, PRODUCT_STATUSES, ProductCondition, ProductStatus } from '../../products/models/product.model';
import { SEARCH_MIN_LENGTH, SHOP_SORTS, ShopFilters, ShopSort } from './shop.model';

/*
 * La URL es la fuente de verdad del shop: de los query params a los filtros (validando, porque la URL la puede
 * escribir cualquiera) y de los filtros a los query params (sin vacíos ni valores por defecto, para que la URL
 * quede limpia: `/shop?category=moviles,ordenadores&page=2`). Funciones puras: sin Angular ni peticiones.
 */

const MAX_VALUES = 10;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** `"a,b"` o `["a", "b"]` (parámetro repetido) → `["a", "b"]`, sin espacios, vacíos ni repetidos. */
function listOf(value: unknown): string[] {
  const parts = (Array.isArray(value) ? value : [value]).filter((part): part is string => typeof part === 'string');
  const clean = parts.flatMap((part) => part.split(',')).map((part) => part.trim().toLowerCase()).filter(Boolean);
  return [...new Set(clean)].slice(0, MAX_VALUES);
}

const slugsOf = (value: unknown): string[] => listOf(value).filter((slug) => SLUG.test(slug));

const allowedOf = <T extends string>(value: unknown, allowed: readonly T[]): T[] =>
  listOf(value).filter((item): item is T => (allowed as readonly string[]).includes(item));

function priceOf(value: unknown): number | null {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const price = Number(value);
  return Number.isFinite(price) && price >= 0 ? price : null;
}

function pageOf(value: unknown): number {
  const page = typeof value === 'string' ? Number(value) : NaN;
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

/** Query params de la URL → filtros válidos. Lo que no sirve se descarta (nunca rompe la pantalla). */
export function filtersFromParams(params: Params): ShopFilters {
  const search = typeof params['search'] === 'string' ? params['search'].trim() : '';
  const sort = typeof params['sort'] === 'string' && (SHOP_SORTS as readonly string[]).includes(params['sort']) ? (params['sort'] as ShopSort) : null;
  const minPrice = priceOf(params['minPrice']);
  let maxPrice = priceOf(params['maxPrice']);
  // Un rango imposible (mín. > máx.) daría 422: se queda solo el mínimo.
  if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) maxPrice = null;

  return {
    category: slugsOf(params['category']),
    seller: slugsOf(params['seller']),
    location: slugsOf(params['location']),
    condition: allowedOf<ProductCondition>(params['condition'], PRODUCT_CONDITIONS),
    status: allowedOf<ProductStatus>(params['status'], PRODUCT_STATUSES),
    minPrice,
    maxPrice,
    search: search.length >= SEARCH_MIN_LENGTH ? search.slice(0, 80) : '',
    sort,
    page: pageOf(params['page']),
  };
}

/** Filtros → query params limpios: sin vacíos, las listas con comas y sin los valores por defecto (página 1). */
export function paramsFromFilters(filters: ShopFilters): Params {
  const params: Params = {};
  for (const key of ['category', 'seller', 'location', 'condition', 'status'] as const) {
    if (filters[key].length) params[key] = filters[key].join(',');
  }
  if (filters.minPrice !== null) params['minPrice'] = String(filters.minPrice);
  if (filters.maxPrice !== null) params['maxPrice'] = String(filters.maxPrice);
  if (filters.search) params['search'] = filters.search;
  if (filters.sort) params['sort'] = filters.sort;
  if (filters.page > 1) params['page'] = String(filters.page);
  return params;
}

/**
 * Aplica unos cambios a los filtros actuales. Cualquier cambio que no sea de página vuelve a la página 1
 * (con otros filtros, la página 5 puede no existir).
 */
export function withChanges(current: ShopFilters, changes: Partial<ShopFilters>): ShopFilters {
  const onlyPage = Object.keys(changes).every((key) => key === 'page');
  return { ...current, ...changes, page: onlyPage ? (changes.page ?? current.page) : 1 };
}

/** ¿Hay algún filtro aplicado (sin contar orden ni página)? */
export function hasActiveFilters(filters: ShopFilters): boolean {
  return (
    filters.category.length + filters.seller.length + filters.location.length + filters.condition.length + filters.status.length > 0 ||
    filters.minPrice !== null ||
    filters.maxPrice !== null ||
    filters.search !== ''
  );
}

/** Igualdad por valor (para no repetir una petición si la URL no ha cambiado de verdad). */
export const sameFilters = (a: ShopFilters, b: ShopFilters): boolean =>
  JSON.stringify(paramsFromFilters(a)) === JSON.stringify(paramsFromFilters(b));

