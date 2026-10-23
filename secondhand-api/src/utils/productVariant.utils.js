/*
 * Identificadores de una variante. Los tres salen de lo mismo (el slug del producto y los valores de
 * sus opciones), así que una dimensión nueva (p. ej. color) se añade cambiando solo este archivo.
 *
 *                    optionsKey              sku                     slug (base)
 *   con opciones     "almacenamiento:256gb"  "IPHONE-13-PRO-256GB"   "iphone-13-pro-256GB"
 *   por defecto      "default"               "IPHONE-13-PRO-DEF"     "iphone-13-pro-default"
 */

/** optionsKey de la variante sin opciones. */
export const DEFAULT_OPTIONS_KEY = "default";
const DEFAULT_SKU_SUFFIX = "DEF";
const DEFAULT_SLUG_SUFFIX = "default";

/** Clave única de las opciones dentro de un producto: "color:negro|talla:m" (ordenada) o "default". */
export const buildOptionsKey = (options = []) =>
  options.length === 0
    ? DEFAULT_OPTIONS_KEY
    : [...options]
        .map((o) => `${o.key.toLowerCase()}:${o.value.toLowerCase()}`)
        .sort()
        .join("|");

/**
 * SKU de una variante: el slug del producto y los valores de sus opciones, en mayúsculas y sin espacios.
 *
 *   buildSku("iphone-13-pro", ["256GB"]) → "IPHONE-13-PRO-256GB"
 *   buildSku("iphone-13-pro")            → "IPHONE-13-PRO-DEF"
 */
export function buildSku(productSlug, optionValues = []) {
  const parts = optionValues.length ? optionValues : [DEFAULT_SKU_SUFFIX];
  return [productSlug, ...parts].join("-").toUpperCase().replace(/\s+/g, "");
}

/**
 * SKU libre a partir de `base`: añade -2, -3… mientras `exists` diga que está ocupado.
 * Recibe la comprobación como función para no depender de la base de datos.
 */
export async function uniqueSku(base, exists) {
  let candidate = base;
  for (let n = 2; await exists(candidate); n++) candidate = `${base}-${n}`;
  return candidate;
}

/**
 * Texto del que sale el slug de una variante; `uniqueSlug` lo normaliza y le añade sufijo si hace falta.
 *
 *   variantSlugBase("iphone-13-pro", ["256GB"]) → "iphone-13-pro-256GB"
 *   variantSlugBase("iphone-13-pro")            → "iphone-13-pro-default"
 */
export function variantSlugBase(productSlug, optionValues = []) {
  const parts = optionValues.length ? optionValues : [DEFAULT_SLUG_SUFFIX];
  return [productSlug, ...parts].join("-");
}
