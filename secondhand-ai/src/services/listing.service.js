import { coreApi } from "../clients/coreApi.client.js";
import { AI_MESSAGES } from "../constants/ai.constants.js";
import { CONDITION_LABELS, LISTING_DRAFT } from "../constants/shop.constants.js";
import { complete } from "../llm/index.js";
import { LISTING_ASSISTANT_PROMPT, listingUserMessage } from "../prompts/listing.prompt.js";
import { BadGatewayError, ValidationError } from "../utils/AppError.js";

/*
 * Asistente de anuncio: a partir de lo que ya hay en el formulario (título, categoría y estado) sugiere
 * - una descripción, que redacta el modelo;
 * - un rango de precio, que NO decide el modelo: son los percentiles 25–75 de productos reales de la tienda.
 * Nada se guarda: el front lo enseña y el vendedor decide si lo usa.
 */

/** Percentil `q` (0–1) de una lista ORDENADA, con interpolación lineal. */
function quantile(sorted, q) {
  const position = (sorted.length - 1) * q;
  const low = Math.floor(position);
  const high = Math.ceil(position);
  return sorted[low] + (sorted[high] - sorted[low]) * (position - low);
}

/**
 * Productos parecidos: primero por título dentro de la categoría; si son pocos, toda la categoría.
 * Todos los estados de venta (lo vendido también dice cuánto se paga) y sin el propio anuncio al editar.
 */
async function findComparables({ title, categorySlug, excludeSlug }) {
  const search = async (params) => {
    const page = await coreApi.searchProducts({ ...params, category: [categorySlug], page: 1, limit: LISTING_DRAFT.COMPARABLES_LIMIT });
    return page.items.filter((product) => product.slug !== excludeSlug);
  };
  const similar = await search({ search: title });
  if (similar.length >= LISTING_DRAFT.MIN_COMPARABLES) return { products: similar, basis: "similar" };
  return { products: await search({}), basis: "category" };
}

/** `{ min, max, basedOn, basis }` en euros enteros, o null si no hay datos suficientes. */
function priceRangeOf({ products, basis }) {
  const prices = products
    .map((product) => product.basePrice)
    .filter((price) => Number.isFinite(price) && price > 0)
    .sort((a, b) => a - b);
  if (prices.length < LISTING_DRAFT.MIN_COMPARABLES) return null;
  return { min: Math.round(quantile(prices, 0.25)), max: Math.round(quantile(prices, 0.75)), basedOn: prices.length, basis };
}

/**
 * El modelo puede saltarse alguna instrucción: lo que no debe acabar en un anuncio se quita aquí, en código
 * (formato markdown, enlaces, correos y teléfonos), y se recorta a un tamaño razonable por una frase entera.
 */
export function cleanDescription(text) {
  let clean = String(text ?? "")
    .replace(/https?:\/\/\S+|www\.\S+/gi, "")
    .replace(/\S+@\S+\.\S+/g, "")
    .replace(/\+?\d[\d\s.-]{7,}\d/g, "")
    .replace(/^\s*(?:[-*•]|\d+\.)\s+/gm, "")
    .replace(/[*_#`>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^["'«“]+|["'»”]+$/g, "")
    .trim();

  const max = LISTING_DRAFT.DESCRIPTION_MAX_LENGTH;
  if (clean.length > max) {
    const cut = clean.slice(0, max);
    const lastSentence = cut.lastIndexOf(". ");
    clean = lastSentence > max / 2 ? cut.slice(0, lastSentence + 1) : `${cut.slice(0, max - 1).trimEnd()}…`;
  }
  return clean;
}

export const listingService = {
  /**
   * @param {{ title: string, categoryId: string, condition: string, excludeSlug?: string }} input ya validado
   * @param {{ id: string }} user
   * @param {AbortSignal} [signal]
   */
  async draft({ title, categoryId, condition, excludeSlug }, user, signal) {
    const categories = await coreApi.listCategories();
    const category = categories.find((item) => String(item._id) === categoryId);
    if (!category) throw new ValidationError(undefined, [{ field: "categoryId", message: "Elige una categoría" }]);

    // El texto y el precio no dependen el uno del otro: en paralelo.
    const [completion, comparables] = await Promise.all([
      complete({
        messages: [
          { role: "system", content: LISTING_ASSISTANT_PROMPT },
          { role: "user", content: listingUserMessage({ title, categoryName: category.name, conditionLabel: CONDITION_LABELS[condition] }) },
        ],
        signal,
        user,
      }),
      findComparables({ title, categorySlug: category.slug, excludeSlug }),
    ]);

    const description = cleanDescription(completion.content);
    if (description.length < LISTING_DRAFT.DESCRIPTION_MIN_LENGTH) throw new BadGatewayError(AI_MESSAGES.FAILED);

    return { description, priceRange: priceRangeOf(comparables), category: { name: category.name, slug: category.slug } };
  },
};
