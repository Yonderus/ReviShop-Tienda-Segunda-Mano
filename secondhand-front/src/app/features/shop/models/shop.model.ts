import { ProductCondition, ProductStatus } from '../../products/models/product.model';

/** Tamaño de página del shop (la API admite de 1 a 48). */
export const SHOP_PAGE_SIZE = 12;

/** Los mismos órdenes que la API. `relevance` solo cuenta si hay búsqueda. */
export const SHOP_SORTS = ['recent', 'price-asc', 'price-desc', 'relevance'] as const;
export type ShopSort = (typeof SHOP_SORTS)[number];

export const SHOP_SORT_LABELS: Record<ShopSort, string> = {
  recent: 'Más recientes',
  'price-asc': 'Precio: de menor a mayor',
  'price-desc': 'Precio: de mayor a menor',
  relevance: 'Más relevantes',
};

/** La búsqueda mínima que la API acepta. */
export const SEARCH_MIN_LENGTH = 2;

/** `GET /shop/categories`. Una principal cuenta también los productos de sus subcategorías. */
export interface ShopCategory {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  parentId: string | null;
  order: number;
  productsCount: number;
}

/** `GET /shop/sellers`: solo lo público, y solo quien tiene algo a la venta. */
export interface ShopSeller {
  _id: string;
  name: string;
  slug: string;
  location?: string;
  avatarUrl?: string;
  productsCount: number;
}

/** `GET /shop/locations`. */
export interface ShopLocation {
  name: string;
  slug: string;
  productsCount: number;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/** `text`: palabras completas · `partial`: trozos del título (si las palabras completas no encontraron nada). */
export type SearchMode = 'text' | 'partial';

/** `GET /shop/products`. */
export interface ShopPage<T> {
  items: T[];
  pagination: Pagination;
  search?: { term: string; mode: SearchMode };
}

/**
 * Los filtros del shop: lo que hay en la URL, ya validado. Vacío (`[]`, `null`, `''`) = sin ese filtro.
 * Cada lista admite varios valores (la API los combina con O; los filtros entre sí, con Y).
 */
export interface ShopFilters {
  category: string[];
  seller: string[];
  location: string[];
  condition: ProductCondition[];
  status: ProductStatus[];
  minPrice: number | null;
  maxPrice: number | null;
  search: string;
  /** null = el de la API (relevancia si se busca; si no, lo más reciente). */
  sort: ShopSort | null;
  page: number;
}

export const EMPTY_SHOP_FILTERS: ShopFilters = {
  category: [],
  seller: [],
  location: [],
  condition: [],
  status: [],
  minPrice: null,
  maxPrice: null,
  search: '',
  sort: null,
  page: 1,
};
