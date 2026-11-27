/*
 * Preguntas públicas en un anuncio ("¿Tiene factura?", "¿Envías a Valencia?"). Cualquiera con sesión pregunta y solo
 * el vendedor (o un admin) responde, una vez. La respuesta la ven todos: el vendedor no contesta lo mismo diez veces.
 */
export const QUESTION_TEXT = Object.freeze({ MIN: 5, MAX: 300 });
export const QUESTION_ANSWER_MAX = 500;

/** Preguntar cuesta poco: con límite por usuario, para que nadie llene un anuncio de preguntas. */
export const QUESTION_RATE_LIMIT = Object.freeze({ WINDOW_MS: 60 * 60 * 1000, PER_USER: 10 });

/** El "suele responder en…" sale de las últimas respuestas del vendedor (la mediana: no la estropea una lenta). */
export const RESPONSE_TIME_SAMPLE = 20;

export const QUESTION_MESSAGES = Object.freeze({
  NOT_FOUND: "Pregunta no encontrada",
  PRODUCT_NOT_FOUND: "Producto no encontrado",
  OWN_PRODUCT: "No puedes preguntar en tu propio anuncio",
  ONLY_SELLER_ANSWERS: "Solo el vendedor puede responder",
  ALREADY_ANSWERED: "Esta pregunta ya tiene respuesta",
  ONLY_SELLER_HIDES: "Solo el vendedor puede ocultar preguntas de su anuncio",
  ONLY_ASKER_DELETES: "Solo quien la hizo puede borrar la pregunta",
  ANSWERED_CANNOT_DELETE: "No se puede borrar una pregunta que ya tiene respuesta",
  TOO_MANY: "Has hecho muchas preguntas seguidas. Prueba de nuevo dentro de un rato",
});
