/** Proveedores del modelo. `fake` responde con guiones fijos: para probar sin gastar ni depender de internet. */
export const AI_PROVIDERS = Object.freeze(["openrouter", "xai", "fake"]);

/** Los dos proveedores reales hablan la API de OpenAI: solo cambia la URL (y la key). */
export const AI_BASE_URLS = Object.freeze({
  openrouter: "https://openrouter.ai/api/v1",
  xai: "https://api.x.ai/v1",
});

/** Respuestas cortas y poco creativas: es un asistente de tienda, no un escritor. */
export const AI_TEMPERATURE = 0.3;

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
  BUSY: "El asistente está saturado ahora mismo. Prueba de nuevo en unos segundos",
  TIMEOUT: "El asistente ha tardado demasiado en responder. Prueba de nuevo",
  FAILED: "El asistente no ha podido responder. Prueba de nuevo",
  CORE_UNAVAILABLE: "La tienda no responde ahora mismo. Inténtalo de nuevo en unos segundos",
  TOO_MANY: "Has hecho muchas preguntas seguidas. Prueba de nuevo dentro de un rato",
  ORIGIN_NOT_ALLOWED: "Origen no permitido",
});
