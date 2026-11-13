import { z } from "zod";
import { PRODUCT_CONDITIONS, SALE_STATUSES } from "../constants/product.constants.js";
import { MAX_FILTER_VALUES, SHOP_PAGE, SHOP_SEARCH, SHOP_SORTS } from "../constants/shop.constants.js";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const isEmpty = (value) => value === undefined || value === null || value === "";

/**
 * Un filtro con varios valores: `?condition=nuevo,como_nuevo` o `?condition=nuevo&condition=como_nuevo`
 * (Express lo convierte en array). Se quitan espacios, vacíos y repetidos; lo que no es texto (p. ej.
 * `?category[$gt]=x`, que llega como objeto) no se toca y lo rechaza Zod con 422.
 *
 * @param {string} field nombre del parámetro, para los mensajes
 * @param {readonly string[]} [allowed] valores permitidos; sin ellos, cada valor tiene que ser un slug
 */
function listParam(field, allowed) {
  const item = allowed
    ? z.enum(allowed, { error: `${field} solo admite: ${allowed.join(", ")}` })
    : z.string().max(80, `Cada ${field} puede tener como mucho 80 caracteres`).regex(SLUG, `${field} debe ser un slug (minúsculas, números y guiones)`);

  return z.preprocess(
    (value) => {
      if (isEmpty(value)) return undefined;
      const parts = Array.isArray(value) ? value : [value];
      if (parts.some((part) => typeof part !== "string")) return value;
      const clean = [...new Set(parts.flatMap((part) => part.split(",")).map((part) => part.trim().toLowerCase()).filter(Boolean))];
      return clean.length ? clean : undefined;
    },
    z.array(item).max(MAX_FILTER_VALUES, `${field} admite como mucho ${MAX_FILTER_VALUES} valores`).optional(),
  );
}

/** Un precio opcional: vacío = sin filtro. Un parámetro repetido (array) no es un número y da 422. */
const price = (field) =>
  z.preprocess(
    (value) => (isEmpty(value) ? undefined : value),
    z.coerce.number({ error: `${field} debe ser un número` }).min(0, `${field} no puede ser negativo`).optional(),
  );

/** Query de `GET /shop/products`: todos los filtros son opcionales y se combinan entre sí. */
export const shopListQuerySchema = z
  .object({
    category: listParam("category"),
    seller: listParam("seller"),
    location: listParam("location"),
    condition: listParam("condition", PRODUCT_CONDITIONS),
    status: listParam("status", SALE_STATUSES),
    minPrice: price("minPrice"),
    maxPrice: price("maxPrice"),
    search: z.preprocess(
      (value) => (isEmpty(value) ? undefined : value),
      z
        .string({ error: "search debe ser un texto" })
        .trim()
        .min(SHOP_SEARCH.MIN_LENGTH, `La búsqueda debe tener al menos ${SHOP_SEARCH.MIN_LENGTH} caracteres`)
        .max(SHOP_SEARCH.MAX_LENGTH, `La búsqueda no puede superar ${SHOP_SEARCH.MAX_LENGTH} caracteres`)
        .optional(),
    ),
    // Sin `sort`, el service elige: por relevancia si hay búsqueda y, si no, lo más reciente.
    sort: z.enum(SHOP_SORTS, { error: `sort solo admite: ${SHOP_SORTS.join(", ")}` }).optional(),
    page: z.coerce.number({ error: "page debe ser un número" }).int("page debe ser un número entero").min(1, "page debe ser 1 o más").default(1),
    limit: z.coerce
      .number({ error: "limit debe ser un número" })
      .int("limit debe ser un número entero")
      .min(1, "limit debe ser 1 o más")
      .max(SHOP_PAGE.MAX_LIMIT, `limit no puede superar ${SHOP_PAGE.MAX_LIMIT}`)
      .default(SHOP_PAGE.DEFAULT_LIMIT),
  })
  .refine((query) => query.minPrice === undefined || query.maxPrice === undefined || query.minPrice <= query.maxPrice, {
    path: ["maxPrice"],
    message: "maxPrice no puede ser menor que minPrice",
  });
