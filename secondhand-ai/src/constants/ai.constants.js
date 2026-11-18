/** Proveedores del modelo. `fake` responde con guiones fijos: para probar sin gastar ni depender de internet. */
export const AI_PROVIDERS = Object.freeze(["openrouter", "xai", "fake"]);

/** Lo que admite `POST /api/ai/chat`. El historial lo guarda el front; aquí solo se acota. */
export const CHAT_LIMITS = Object.freeze({
  MAX_MESSAGES: 20,
  MAX_CONTENT_LENGTH: 1000,
});

/** Roles que puede mandar el cliente. `system` y `tool` los pone solo el servidor. */
export const CLIENT_ROLES = Object.freeze(["user", "assistant"]);

/** Tiene que coincidir con SESSION_COOKIE.NAME de la API: es la cookie que se reenvía a `GET /auth/me`. */
export const SESSION_COOKIE_NAME = "revishop_session";

export const AI_MESSAGES = Object.freeze({
  LOGIN_REQUIRED: "Inicia sesión para usar el asistente",
  DISABLED: "El asistente está desactivado en este momento",
  CORE_UNAVAILABLE: "La tienda no responde ahora mismo. Inténtalo de nuevo en unos segundos",
  TOO_MANY: "Has hecho muchas preguntas seguidas. Prueba de nuevo dentro de un rato",
  ORIGIN_NOT_ALLOWED: "Origen no permitido",
});
