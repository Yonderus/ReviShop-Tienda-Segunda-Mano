import { AGENT_SHOP } from "../constants/shop.constants.js";

/*
 * Lo que ve el MODELO de cada producto: lo justo para recomendar. Las tarjetas del chat no salen de aquí sino de
 * los datos completos de la API, así que si el modelo se equivoca en un precio, la tarjeta sigue siendo la buena.
 */

const truncate = (text, max) => {
  const clean = String(text ?? "").replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
};

/** Para los resultados de búsqueda: sin descripción (la escribe el vendedor y no hace falta para listar). */
export const productSummary = (product) => ({
  title: product.title,
  slug: product.slug,
  price: product.basePrice,
  condition: product.condition,
  status: product.status,
  location: product.location ?? null,
  category: product.category?.slug ?? null,
  seller: product.seller?.name ?? null,
});

/** Para el detalle: con la descripción recortada y las variantes que se pueden elegir. */
export const productDetail = (product, variants = []) => ({
  ...productSummary(product),
  description: truncate(product.description, AGENT_SHOP.DESCRIPTION_MAX_LENGTH),
  variants: variants.map((variant) => ({
    options: (variant.options ?? []).map((option) => `${option.name ?? option.key}: ${option.value}`).join(", ") || "única",
    price: variant.price ?? product.basePrice,
    status: variant.status,
  })),
});
