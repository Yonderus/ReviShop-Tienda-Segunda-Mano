import { z } from "zod";
import { CHAT_LIMITS, CLIENT_ROLES } from "../constants/ai.constants.js";
import { PRODUCT_CONDITIONS, SLUG_PATTERN } from "../constants/shop.constants.js";

const { MAX_MESSAGES, MAX_CONTENT_LENGTH } = CHAT_LIMITS;

/*
 * El historial lo manda el front. Solo se aceptan mensajes `user` y `assistant` con texto: el cliente no puede
 * colar un `system` (cambiar las instrucciones) ni un `tool` (inventarse resultados de búsqueda). Cualquier otra
 * propiedad del mensaje se descarta.
 */
const messageSchema = z.object({
  role: z.enum(CLIENT_ROLES, { error: `role solo admite: ${CLIENT_ROLES.join(", ")}` }),
  content: z
    .string({ error: "content debe ser un texto" })
    .trim()
    .min(1, "El mensaje no puede estar vacío")
    .max(MAX_CONTENT_LENGTH, `Cada mensaje puede tener como mucho ${MAX_CONTENT_LENGTH} caracteres`),
});

export const chatSchema = z.object({
  messages: z
    .array(messageSchema, { error: "messages debe ser una lista de mensajes" })
    .min(1, "Escribe un mensaje")
    .max(MAX_MESSAGES, `Como mucho ${MAX_MESSAGES} mensajes por petición`)
    .refine((messages) => messages.at(-1)?.role === "user", "El último mensaje tiene que ser tuyo"),
});

/**
 * Asistente de anuncio. Los mismos límites que el formulario y la API para el título; la categoría por su id
 * (lo que tiene el formulario) y, al editar, el slug del propio anuncio para no compararlo consigo mismo.
 */
export const listingDraftSchema = z.object({
  title: z
    .string({ error: "El título es obligatorio" })
    .trim()
    .min(3, "El título debe tener al menos 3 caracteres")
    .max(80, "El título no puede superar 80 caracteres"),
  categoryId: z.string({ error: "Elige una categoría" }).regex(/^[a-f\d]{24}$/i, "Elige una categoría"),
  condition: z.enum(PRODUCT_CONDITIONS, { error: "Elige el estado del producto" }),
  excludeSlug: z.string().regex(SLUG_PATTERN, "excludeSlug no es un slug válido").max(120).optional(),
});

/** El perfil del que se resumen las valoraciones: un slug (lo que se pasa tal cual a la API). */
export const sellerSlugParamsSchema = z.object({
  slug: z.string().max(120, "slug no válido").regex(SLUG_PATTERN, "slug no válido"),
});
