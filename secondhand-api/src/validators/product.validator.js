import { z } from "zod";

const conditions = ["nuevo", "como_nuevo", "bueno", "aceptable", "mejorable"];
const statuses = ["disponible", "reservado", "vendido"];

const objectId = (field) => z.string().regex(/^[0-9a-fA-F]{24}$/, `${field} no es un ID válido`);

const imageInputSchema = z.object({
  url: z.url({ protocol: /^https?$/, error: "Cada imagen debe tener una URL http(s) válida" }),
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
  condition: z.enum(conditions, { error: `condition debe ser: ${conditions.join(", ")}` }),
  location: z.string().trim().max(100, "La ubicación no puede superar 100 caracteres").optional(),
  categoryId: objectId("categoryId"),
  sellerId: objectId("sellerId"),
  images: z
    .array(imageInputSchema)
    .max(5, "Como máximo 5 imágenes")
    .refine((list) => new Set(list.map((i) => i.url)).size === list.length, "Hay imágenes repetidas")
    .optional(),
});

/** Parcial y sin `status`: el estado de venta va por PATCH /:id/status. */
export const updateProductSchema = createProductSchema.partial();

export const changeStatusSchema = z.object({
  status: z.enum(statuses, { error: `status debe ser: ${statuses.join(", ")}` }),
});

export const setActiveSchema = z.object({
  isActive: z.boolean({ error: "isActive es obligatorio y debe ser true o false" }),
});

export const restoreSchema = z.object({
  isActive: z.boolean({ error: "isActive debe ser true o false" }).optional(),
});

export const idParamsSchema = z.object({ id: objectId("id") });

export const slugParamsSchema = z.object({
  slug: z.string().trim().min(1, "El slug es obligatorio"),
});

export const listQuerySchema = z.object({
  category: z.string().trim().optional(),
  seller: z.string().trim().optional(),
  condition: z.enum(conditions, { error: `condition debe ser: ${conditions.join(", ")}` }).optional(),
  status: z.enum(statuses, { error: `status debe ser: ${statuses.join(", ")}` }).optional(),
  minPrice: z.coerce.number({ error: "minPrice debe ser un número" }).min(0, "minPrice debe ser positivo").optional(),
  maxPrice: z.coerce.number({ error: "maxPrice debe ser un número" }).min(0, "maxPrice debe ser positivo").optional(),
  isActive: z.enum(["true", "false"], { error: "isActive debe ser true o false" }).optional(),
});

export const stateListQuerySchema = listQuerySchema.omit({ isActive: true });
