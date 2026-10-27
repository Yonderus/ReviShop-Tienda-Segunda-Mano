import { z } from "zod";
import { CATEGORY_STATUSES } from "../constants/category.constants.js";
import { objectId } from "./common.validator.js";

const status = z.enum(CATEGORY_STATUSES, { error: `status debe ser: ${CATEGORY_STATUSES.join(", ")}` });

/** Un atributo de variante (p. ej. talla) con sus valores posibles. Sin valores repetidos. */
const attributeSchema = z
  .object({
    key: z
      .string({ error: "Cada atributo necesita una clave" })
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9_]+$/, "La clave solo puede tener letras sin tilde, números y _ (sin espacios)")
      .max(30, "La clave no puede superar 30 caracteres"),
    label: z.string({ error: "Cada atributo necesita una etiqueta" }).trim().min(1, "La etiqueta no puede estar vacía").max(40, "La etiqueta no puede superar 40 caracteres"),
    values: z.array(z.string().trim().min(1, "Los valores no pueden estar vacíos").max(40, "Cada valor puede tener como mucho 40 caracteres")).max(30, "Como máximo 30 valores por atributo").optional(),
  })
  .superRefine(({ values = [] }, ctx) => {
    if (new Set(values).size !== values.length) ctx.addIssue({ code: "custom", path: ["values"], message: "Hay valores repetidos" });
  });

/** Sin claves repetidas: el error va al atributo repetido, para pintarlo junto a su campo. */
const attributesSchema = z
  .array(attributeSchema, { error: "attributes debe ser una lista" })
  .max(10, "Como máximo 10 atributos")
  .superRefine((attributes, ctx) => {
    const seen = new Set();
    attributes.forEach(({ key }, index) => {
      if (seen.has(key)) ctx.addIssue({ code: "custom", path: [index, "key"], message: `La clave "${key}" está repetida` });
      seen.add(key);
    });
  });

export const createCategorySchema = z.object({
  name: z
    .string({ error: "El nombre es obligatorio" })
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(60, "El nombre no puede superar 60 caracteres"),
  description: z.string().trim().max(300, "La descripción no puede superar 300 caracteres").optional(),
  /** null = categoría principal. */
  parentId: objectId("parentId").nullable().optional(),
  attributes: attributesSchema.optional(),
  order: z.number({ error: "order debe ser un número" }).int("order debe ser un número entero").min(0, "order no puede ser negativo").optional(),
  status: status.optional(),
});

export const updateCategorySchema = createCategorySchema.partial();

/** Listados del panel: incluyen borradores; se pueden filtrar por estado. */
export const adminListQuerySchema = z.object({ status: status.optional() });
