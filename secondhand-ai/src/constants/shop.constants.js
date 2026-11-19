/*
 * Valores de la tienda que usan las herramientas del agente. Son una COPIA de los de la API
 * (secondhand-api/src/constants/product.constants.js y shop.constants.js): este servicio no importa código de la
 * API. Si allí cambian, hay que cambiarlos aquí (si no, la API responderá 422 y el modelo lo verá como error).
 */
export const PRODUCT_CONDITIONS = Object.freeze(["nuevo", "como_nuevo", "bueno", "aceptable", "mejorable"]);
export const SHOP_SORTS = Object.freeze(["recent", "price-asc", "price-desc", "relevance"]);
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const SHOP_SEARCH = Object.freeze({ MIN_LENGTH: 2, MAX_LENGTH: 80 });

/** Como en el front (CONDITION_LABELS): lo que lee el modelo al redactar un anuncio. */
export const CONDITION_LABELS = Object.freeze({
  nuevo: "Nuevo",
  como_nuevo: "Como nuevo",
  bueno: "Buen estado",
  aceptable: "Aceptable",
  mejorable: "Mejorable",
});

/** Asistente de anuncio. */
export const LISTING_DRAFT = Object.freeze({
  /** Productos parecidos que se miran para el rango de precio (el máximo por página de /shop/products). */
  COMPARABLES_LIMIT: 48,
  /** Con menos, un rango no dice nada: no se da. */
  MIN_COMPARABLES: 3,
  /** La descripción sugerida: entre lo que exige la API (10) y algo que se lea de un vistazo. */
  DESCRIPTION_MIN_LENGTH: 10,
  DESCRIPTION_MAX_LENGTH: 600,
});

/** Lo que usan las herramientas. */
export const AGENT_SHOP = Object.freeze({
  /** Productos por búsqueda: los que se enseñan como tarjetas en el chat. */
  RESULTS_LIMIT: 6,
  /** Valores por filtro que puede pedir el modelo. */
  MAX_FILTER_VALUES: 5,
  /** El asistente es de compra: por defecto solo lo que se puede comprar. */
  DEFAULT_STATUS: Object.freeze(["disponible"]),
  /** La descripción la escribe el vendedor: se recorta (menos tokens y menos superficie para inyecciones). */
  DESCRIPTION_MAX_LENGTH: 300,
  /** Llamadas a herramientas que se atienden en una misma vuelta del modelo. */
  MAX_CALLS_PER_STEP: 4,
});
