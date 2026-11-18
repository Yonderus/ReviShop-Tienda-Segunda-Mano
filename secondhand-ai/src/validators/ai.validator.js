import { z } from "zod";
import { CHAT_LIMITS, CLIENT_ROLES } from "../constants/ai.constants.js";

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
