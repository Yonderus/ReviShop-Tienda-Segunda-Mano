/** Lo que lleva el SKU de la variante por defecto (la que no tiene opciones) en lugar de valores. */
export const DEFAULT_SKU_SUFFIX = "DEF";

/**
 * SKU de una variante: el slug del producto y los valores de sus opciones, en mayúsculas y sin espacios.
 * Sin valores es la variante por defecto.
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
