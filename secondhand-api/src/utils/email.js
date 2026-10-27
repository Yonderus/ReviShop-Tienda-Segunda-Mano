import { z } from "zod";

/**
 * Regla única para los emails. La usan el validador (Zod) y el modelo (Mongoose), como `isHttpUrl`: si cada
 * capa tuviera la suya, un email podría pasar el validador y fallar después en el modelo.
 */
const emailSchema = z.email();

/** true si `value` es un email válido. */
export const isEmail = (value) => emailSchema.safeParse(value).success;
