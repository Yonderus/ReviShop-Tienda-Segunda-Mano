/** Tienda pública (`/api/shop`): tamaño de página. */
export const SHOP_PAGE = Object.freeze({
  DEFAULT_LIMIT: 12,
  MAX_LIMIT: 48,
});

/** Órdenes del listado. `relevance` solo tiene sentido con búsqueda (sin ella se usa `recent`). */
export const SHOP_SORT = Object.freeze({
  RECENT: "recent",
  PRICE_ASC: "price-asc",
  PRICE_DESC: "price-desc",
  RELEVANCE: "relevance",
});
export const SHOP_SORTS = Object.freeze(Object.values(SHOP_SORT));

/** Cuántos valores admite un filtro (`?category=a,b,c…`). */
export const MAX_FILTER_VALUES = 10;

/** Búsqueda por texto. */
export const SHOP_SEARCH = Object.freeze({
  MIN_LENGTH: 2,
  MAX_LENGTH: 80,
  /** `text`: palabras completas con el índice de texto. `partial`: trozos de palabra en el título (respaldo). */
  MODE: Object.freeze({ TEXT: "text", PARTIAL: "partial" }),
});
