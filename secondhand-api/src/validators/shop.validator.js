import { z } from "zod";
import { SHOP_PAGE } from "../constants/shop.constants.js";

/** Paginación de la tienda: `page` desde 1 y `limit` de 1 a MAX_LIMIT. Sin valor, los de por defecto. */
export const shopListQuerySchema = z.object({
  page: z.coerce.number({ error: "page debe ser un número" }).int("page debe ser un número entero").min(1, "page debe ser 1 o más").default(1),
  limit: z.coerce
    .number({ error: "limit debe ser un número" })
    .int("limit debe ser un número entero")
    .min(1, "limit debe ser 1 o más")
    .max(SHOP_PAGE.MAX_LIMIT, `limit no puede superar ${SHOP_PAGE.MAX_LIMIT}`)
    .default(SHOP_PAGE.DEFAULT_LIMIT),
});
