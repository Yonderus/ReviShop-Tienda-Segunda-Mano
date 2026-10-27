import { z } from "zod";

const optionSchema = z.object({
  key: z.string({ error: "Cada opción necesita un atributo (key)" }).trim().toLowerCase().min(1, "El atributo no puede estar vacío"),
  value: z.string({ error: "Cada opción necesita un valor" }).trim().min(1, "El valor no puede estar vacío"),
});

const price = z.number({ error: "price debe ser un número" }).min(0, "El precio no puede ser negativo").nullable();
const stock = z.number({ error: "stock debe ser un número" }).int("El stock debe ser un número entero").min(0, "El stock no puede ser negativo");

/** Sin opciones no es una variante nueva: la variante sin opciones es la "Única" que crea el producto. */
export const createVariantSchema = z.object({
  options: z.array(optionSchema, { error: "options debe ser una lista" }).min(1, "Una variante necesita al menos una opción"),
  price: price.optional(),
  stock: stock.optional(),
});

/** Solo precio y stock: cambiar las opciones cambiaría el SKU. */
export const updateVariantSchema = z
  .object({
    price: price.optional(),
    stock: stock.optional(),
    options: z.never({ error: "Las opciones no se pueden cambiar: borra la variante y crea otra" }).optional(),
  })
  .refine((data) => data.price !== undefined || data.stock !== undefined, "Envía price o stock");
