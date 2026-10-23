import { z } from "zod";

/**
 * Regla única para las URL de imagen. La usan el validador (Zod) y el modelo (Mongoose): si cada capa
 * tuviera la suya, una URL podría pasar el validador y fallar después en el modelo, a mitad de guardar.
 */
const httpUrlSchema = z.url({ protocol: /^https?$/ });

/** true si `value` es una URL http(s) válida. */
export const isHttpUrl = (value) => httpUrlSchema.safeParse(value).success;
