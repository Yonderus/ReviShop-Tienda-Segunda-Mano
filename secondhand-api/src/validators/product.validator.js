import { z } from "zod";
import { PRODUCT_CONDITIONS, SALE_STATUSES } from "../constants/product.constants.js";
import { isHttpUrl } from "../utils/url.js";
import { objectId } from "./common.validator.js";

const INVALID_IMAGE_URL = "Cada imagen debe tener una URL http(s) válida";

const imageInputSchema = z.object({
  url: z.string({ error: INVALID_IMAGE_URL }).refine(isHttpUrl, INVALID_IMAGE_URL),
  alt: z.string().trim().max(120, "El texto alternativo no puede superar 120 caracteres").optional(),
});

export const createProductSchema = z.object({
  title: z
    .string({ error: "El título es obligatorio" })
    .trim()
    .min(3, "El título debe tener al menos 3 caracteres")
    .max(80, "El título no puede superar 80 caracteres"),
  description: z
    .string({ error: "La descripción es obligatoria" })
    .trim()
    .min(10, "La descripción debe tener al menos 10 caracteres")
    .max(2000, "La descripción no puede superar 2000 caracteres"),
  basePrice: z.number({ error: "basePrice debe ser un número" }).min(0, "basePrice debe ser mayor o igual a 0"),
  condition: z.enum(PRODUCT_CONDITIONS, { error: `condition debe ser: ${PRODUCT_CONDITIONS.join(", ")}` }),
  location: z.string().trim().max(100, "La ubicación no puede superar 100 caracteres").optional(),
  categoryId: objectId("categoryId"),
  // Solo lo tiene en cuenta un admin (para publicar en nombre de otro). Para el resto, el vendedor es el de la sesión.
  sellerId: objectId("sellerId").optional(),
  images: z
    .array(imageInputSchema)
    .max(5, "Como máximo 5 imágenes")
    .refine((list) => new Set(list.map((i) => i.url)).size === list.length, "Hay imágenes repetidas")
    .optional(),
});

/** Parcial y sin `status`: el estado de venta va por PATCH /:id/status. */
export const updateProductSchema = createProductSchema.partial();

export const changeStatusSchema = z.object({
  status: z.enum(SALE_STATUSES, { error: `status debe ser: ${SALE_STATUSES.join(", ")}` }),
});

export const listQuerySchema = z.object({
  category: z.string().trim().optional(),
  seller: z.string().trim().optional(),
  condition: z.enum(PRODUCT_CONDITIONS, { error: `condition debe ser: ${PRODUCT_CONDITIONS.join(", ")}` }).optional(),
  status: z.enum(SALE_STATUSES, { error: `status debe ser: ${SALE_STATUSES.join(", ")}` }).optional(),
  minPrice: z.coerce.number({ error: "minPrice debe ser un número" }).min(0, "minPrice debe ser positivo").optional(),
  maxPrice: z.coerce.number({ error: "maxPrice debe ser un número" }).min(0, "maxPrice debe ser positivo").optional(),
});

/** Los listados del panel (activos, inactivos, papelera) aceptan los mismos filtros que el público. */
export const stateListQuerySchema = listQuerySchema;
