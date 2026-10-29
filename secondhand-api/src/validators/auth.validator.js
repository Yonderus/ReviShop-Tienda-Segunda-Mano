import { z } from "zod";
import { PASSWORD_MAX_LENGTH } from "../constants/user.constants.js";

/**
 * Login. No se comprueba el formato del email ni el mínimo de la contraseña: un email mal escrito o una
 * contraseña corta son, simplemente, credenciales incorrectas (401), sin dar pistas.
 */
export const loginSchema = z.object({
  email: z.string({ error: "El email es obligatorio" }).trim().toLowerCase().min(1, "El email es obligatorio"),
  password: z
    .string({ error: "La contraseña es obligatoria" })
    .min(1, "La contraseña es obligatoria")
    .max(PASSWORD_MAX_LENGTH, `La contraseña no puede superar ${PASSWORD_MAX_LENGTH} caracteres`),
});
