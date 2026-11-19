import { z } from "zod";
import { coreApi } from "../clients/coreApi.client.js";
import { AGENT_SHOP, PRODUCT_CONDITIONS, SHOP_SEARCH, SHOP_SORTS, SLUG_PATTERN } from "../constants/shop.constants.js";
import { productSummary } from "./summaries.js";

const slugList = (what) =>
  z
    .array(z.string().regex(SLUG_PATTERN, `Cada ${what} debe ser un slug`))
    .min(1)
    .max(AGENT_SHOP.MAX_FILTER_VALUES);

/** Los argumentos son los query params de `GET /api/shop/products` (los mismos nombres). */
const schema = z
  .object({
    search: z
      .string()
      .trim()
      .min(SHOP_SEARCH.MIN_LENGTH)
      .max(SHOP_SEARCH.MAX_LENGTH)
      .describe("Palabras clave del producto (p. ej. 'bici montaña'). Opcional si ya filtras por categoría.")
      .optional(),
    category: slugList("categoría").describe("Slugs de categoría (de list_categories). Incluye sus subcategorías.").optional(),
    location: slugList("ubicación").describe("Slugs de ubicación (de list_locations), p. ej. 'valencia'.").optional(),
    condition: z.array(z.enum(PRODUCT_CONDITIONS)).min(1).max(PRODUCT_CONDITIONS.length).describe("Estado de conservación.").optional(),
    minPrice: z.number().min(0).describe("Precio mínimo en euros.").optional(),
    maxPrice: z.number().min(0).describe("Precio máximo en euros.").optional(),
    sort: z.enum(SHOP_SORTS).describe("Orden. 'relevance' solo con search.").optional(),
  })
  .strict()
  .refine((args) => args.minPrice === undefined || args.maxPrice === undefined || args.minPrice <= args.maxPrice, {
    message: "minPrice no puede ser mayor que maxPrice",
  });

export const searchProductsTool = {
  name: "search_products",
  description:
    "Busca productos a la venta en Revishop. Combina filtros. Devuelve como mucho 6 productos (los que el usuario verá como tarjetas) y el total.",
  schema,

  /**
   * @param {z.infer<typeof schema>} args ya validados
   * @param {{ products: object[], shopQuery: object | null }} context lo que acabará en la respuesta del chat
   */
  async run(args, context) {
    // Solo lo que se puede comprar: el asistente es de compra.
    const shopQuery = { ...args, status: [...AGENT_SHOP.DEFAULT_STATUS] };
    const page = await coreApi.searchProducts({ ...shopQuery, page: 1, limit: AGENT_SHOP.RESULTS_LIMIT });

    // La última búsqueda manda: sus productos (tal cual los da la API) son las tarjetas del chat.
    context.products = page.items;
    context.shopQuery = page.pagination.total > 0 ? shopQuery : null;

    return {
      total: page.pagination.total,
      shown: page.items.length,
      items: page.items.map(productSummary),
    };
  },
};
