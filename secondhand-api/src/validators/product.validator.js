import { z } from "zod";

const categories = [
  "electronica",
  "ropa",
  "hogar",
  "deportes",
  "vehiculos",
  "libros",
  "juguetes",
  "otros",
];

const conditions = ["nuevo", "como_nuevo", "bueno", "aceptable", "mejorable"];

const statuses = ["disponible", "reservado", "vendido"];

export const createProductSchema = z.object({
  title: z.string().trim().min(1, "El titulo es obligatorio"),
  description: z.string().trim().min(1, "La descripcion es obligatoria"),
  price: z.number({ error: "El precio debe ser un numero" }).min(0, "El precio debe ser mayor o igual a 0"),
  category: z.enum(categories, { error: `Categoria debe ser: ${categories.join(", ")}` }),
  condition: z.enum(conditions, { error: `Condicion debe ser: ${conditions.join(", ")}` }),
  location: z.string().trim().optional(),
  images: z.array(z.url("Cada imagen debe ser una URL valida")).optional(),
  seller: z.string().trim().min(1, "El vendedor es obligatorio"),
  status: z.enum(statuses, { error: `Status debe ser: ${statuses.join(", ")}` }).optional(),
});

export const updateProductSchema = createProductSchema.partial();

export const setActiveSchema = z.object({
  isActive: z.boolean({ error: "isActive es obligatorio y debe ser true o false" }),
});

export const restoreSchema = z.object({
  isActive: z.boolean({ error: "isActive debe ser true o false" }).optional(),
});

export const idParamsSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, "ID de producto no valido"),
});

export const slugParamsSchema = z.object({
  slug: z.string().trim().min(1, "El slug es obligatorio"),
});

export const listQuerySchema = z.object({
  category: z.enum(categories, { error: `Categoria debe ser: ${categories.join(", ")}` }).optional(),
  condition: z.enum(conditions, { error: `Condicion debe ser: ${conditions.join(", ")}` }).optional(),
  status: z.enum(statuses, { error: `Status debe ser: ${statuses.join(", ")}` }).optional(),
  seller: z.string().trim().optional(),
  minPrice: z.coerce.number({ error: "minPrice debe ser un numero" }).min(0, "minPrice debe ser un numero positivo").optional(),
  maxPrice: z.coerce.number({ error: "maxPrice debe ser un numero" }).min(0, "maxPrice debe ser un numero positivo").optional(),
  isActive: z.enum(["true", "false"], { error: "isActive debe ser true o false" }).optional(),
});

export const stateListQuerySchema = listQuerySchema.omit({ isActive: true });
