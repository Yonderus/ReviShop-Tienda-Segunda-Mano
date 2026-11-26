import { z } from "zod";
import { SALE_PAGE, SALE_ROLES, SALE_STATES } from "../constants/sale.constants.js";
import { isEmail } from "../utils/email.js";
import { objectId } from "./common.validator.js";

export const registerSaleSchema = z.object({
  variantId: objectId("variantId"),
  // Normalizado como en el login y en los usuarios: los emails se guardan en minúsculas.
  buyerEmail: z
    .string({ error: "El email del comprador es obligatorio" })
    .trim()
    .toLowerCase()
    .max(254, "El email no puede superar 254 caracteres")
    .refine(isEmail, "Escribe un email válido"),
});

export const mySalesQuerySchema = z.object({
  as: z.enum(SALE_ROLES, { error: `as debe ser: ${SALE_ROLES.join(", ")}` }),
  status: z.enum(SALE_STATES, { error: `status debe ser: ${SALE_STATES.join(", ")}` }).optional(),
  // Las de un producto (la ficha de gestión enseña las ventas de cada variante).
  productId: objectId("productId").optional(),
  page: z.coerce.number({ error: "page debe ser un número" }).int().min(1, "page empieza en 1").default(1),
  limit: z.coerce
    .number({ error: "limit debe ser un número" })
    .int()
    .min(1, "limit debe ser al menos 1")
    .max(SALE_PAGE.MAX_LIMIT, `limit no puede superar ${SALE_PAGE.MAX_LIMIT}`)
    .default(SALE_PAGE.DEFAULT_LIMIT),
});
