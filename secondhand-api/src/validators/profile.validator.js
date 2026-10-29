import { z } from "zod";
import { isHttpUrl } from "../utils/url.js";

/**
 * Los campos del perfil. Los usan `PATCH /profile/me` (cada uno el suyo) y el panel al crear y editar
 * usuarios (`user.validator.js`): una sola regla para los dos. Sin `userId`: el perfil es siempre el de la
 * sesión, y Zod descarta cualquier campo que no esté aquí.
 */
export const profileFieldsSchema = z.object({
  // Vacío = sin teléfono (así se puede borrar en un PATCH).
  phone: z
    .string()
    .trim()
    .max(20, "El teléfono no puede superar 20 caracteres")
    .regex(/^[\d\s+()-]*$/, "El teléfono solo puede tener números, espacios y + ( ) -")
    .optional(),
  location: z.string().trim().max(100, "La ubicación no puede superar 100 caracteres").optional(),
  bio: z.string().trim().max(300, "La bio no puede superar 300 caracteres").optional(),
  // URL de la foto del perfil; null la quita. Misma regla que las fotos de producto.
  avatarUrl: z.string().trim().refine(isHttpUrl, "El avatar debe ser una URL http(s) válida").nullable().optional(),
});

/** PATCH /profile/me: todo opcional, solo cambia lo que llegue. */
export const updateProfileSchema = profileFieldsSchema;
