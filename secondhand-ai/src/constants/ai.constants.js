/** Proveedores del modelo. `fake` responde con guiones fijos: para probar sin gastar ni depender de internet. */
export const AI_PROVIDERS = Object.freeze(["groq", "openrouter", "xai", "fake"]);

/**
 * Los proveedores reales hablan la API de OpenAI: solo cambian la URL y la key.
 * Groq (no confundir con Grok, el modelo de xAI) ejecuta modelos abiertos y tiene plan gratuito.
 */
export const AI_BASE_URLS = Object.freeze({
  groq: "https://api.groq.com/openai/v1",
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
  /** Respuesta (no error) cuando el agente agota sus vueltas de herramientas sin llegar a contestar. */
  INCOMPLETE: "No he podido completar la búsqueda. Prueba a concretar un poco más (categoría, precio o ubicación).",
  CORE_UNAVAILABLE: "La tienda no responde ahora mismo. Inténtalo de nuevo en unos segundos",
  TOO_MANY: "Has hecho muchas preguntas seguidas. Prueba de nuevo dentro de un rato",
  ORIGIN_NOT_ALLOWED: "Origen no permitido",
  TOO_MANY_SUMMARIES: "Demasiadas peticiones seguidas. Prueba de nuevo dentro de un rato",
});

/**
 * Resumen de las valoraciones de un vendedor («Lo que dicen de Lucía»). Es público (lo ve cualquiera en el perfil),
 * así que se cachea en memoria: solo se paga una llamada al modelo por cada valoración nueva, no por cada visita.
 */
export const REVIEW_SUMMARY = Object.freeze({
  /** Con menos comentarios no hay de qué resumir: no se llama al modelo. */
  MIN_COMMENTS: 3,
  /** Los más recientes que se le pasan al modelo (menos tokens y menos superficie para inyecciones). */
  MAX_COMMENTS: 40,
  /** Cada comentario se recorta a esto: lo escribe un usuario. */
  COMMENT_MAX_LENGTH: 500,
  /** Valoraciones que se piden a la API (la página más grande que admite). */
  FETCH_LIMIT: 50,
  SUMMARY_MAX_LENGTH: 400,
  POINTS_MAX: 3,
  POINT_MAX_LENGTH: 90,
  /** Resúmenes que se guardan a la vez (los más antiguos salen primero). */
  CACHE_MAX_ENTRIES: 500,
  /** Peticiones por IP y hora: es público, pero cada fallo de caché cuesta una llamada. */
  RATE_LIMIT_PER_HOUR: 60,
});
