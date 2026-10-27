import { z } from "zod";

/** Piezas de validación que comparten todas las entidades con CRUD. */

export const objectId = (field) => z.string().regex(/^[0-9a-fA-F]{24}$/, `${field} no es un ID válido`);

export const idParamsSchema = z.object({ id: objectId("id") });

export const slugParamsSchema = z.object({
  slug: z.string().trim().min(1, "El slug es obligatorio"),
});

export const setActiveSchema = z.object({
  isActive: z.boolean({ error: "isActive es obligatorio y debe ser true o false" }),
});

/** Al restaurar, isActive es opcional: si no llega, el registro vuelve inactivo. */
export const restoreSchema = z.object({
  isActive: z.boolean({ error: "isActive debe ser true o false" }).optional(),
});
