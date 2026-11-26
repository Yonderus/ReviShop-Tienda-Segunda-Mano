/*
 * Valoraciones entre comprador y vendedor, y denuncias. Solo se valora con una venta CONFIRMADA y dentro de su
 * ventana (REVIEW_WINDOW_HOURS, en sale.constants). Las valoraciones son CIEGAS: ninguno ve la del otro hasta que
 * los dos han valorado o se acaba la ventana (ver `visibleAt` en el modelo).
 */

/** A quién se valora: al vendedor (lo hace el comprador) o al comprador (lo hace el vendedor). */
export const REVIEWEE_ROLE = Object.freeze({ SELLER: "seller", BUYER: "buyer" });
export const REVIEWEE_ROLES = Object.freeze(Object.values(REVIEWEE_ROLE));

/**
 * Criterios de cada lado, todos de 1 a 5 y obligatorios. Al vendedor se le pregunta además si el producto estaba
 * como se anunciaba: es lo más útil en segunda mano.
 */
export const REVIEW_CRITERIA = Object.freeze({
  seller: Object.freeze(["asDescribed", "communication", "punctuality"]),
  buyer: Object.freeze(["communication", "punctuality"]),
});
export const ALL_REVIEW_CRITERIA = Object.freeze(["asDescribed", "communication", "punctuality"]);

export const REVIEW_RATING = Object.freeze({ MIN: 1, MAX: 5 });

/** Con esta nota o menos, el comentario es obligatorio: si algo fue mal, la explicación ayuda a los demás. */
export const REVIEW_LOW_RATING = 2;
export const REVIEW_COMMENT = Object.freeze({ MIN_WHEN_LOW: 20, MAX: 1000 });
export const REVIEW_REPLY_MAX = 500;

export const REVIEW_PAGE = Object.freeze({ DEFAULT_LIMIT: 10, MAX_LIMIT: 50 });

/** Denuncias: qué se puede denunciar, por qué y en qué estado está. */
export const REPORT_TARGET = Object.freeze({ REVIEW: "review", QUESTION: "question" });
export const REPORT_TARGETS = Object.freeze(Object.values(REPORT_TARGET));
export const REPORT_REASONS = Object.freeze(["insultos", "datos_personales", "no_tiene_que_ver", "spam", "otro"]);
export const REPORT_STATUS = Object.freeze({ OPEN: "open", DISMISSED: "dismissed", ACTIONED: "actioned" });
export const REPORT_STATUSES = Object.freeze(Object.values(REPORT_STATUS));
export const REPORT_NOTE_MAX = 300;
/** Denunciar cuesta poco y obliga a alguien a revisarlo: con límite por usuario. */
export const REPORT_RATE_LIMIT = Object.freeze({ WINDOW_MS: 60 * 60 * 1000, PER_USER: 20 });

/** Cómo sale un usuario que ya no está (suspendido, desactivado o borrado) en una valoración que escribió. */
export const FORMER_USER_NAME = "Usuario de Revishop";

export const REVIEW_MESSAGES = Object.freeze({
  NOT_FOUND: "Valoración no encontrada",
  SALE_NOT_CONFIRMED: "Solo se puede valorar una venta confirmada por el comprador",
  WINDOW_CLOSED: "El plazo para valorar esta venta ha terminado",
  ALREADY_REVIEWED: "Ya has valorado esta venta. Las valoraciones no se pueden cambiar",
  COMMENT_REQUIRED: `Con una nota de ${REVIEW_LOW_RATING} o menos, cuenta qué pasó (al menos ${REVIEW_COMMENT.MIN_WHEN_LOW} caracteres)`,
  ONLY_REVIEWEE_REPLIES: "Solo puede responder la persona valorada",
  NOT_VISIBLE_YET: "La valoración aún no es pública: podrás responder cuando se publique",
  ALREADY_REPLIED: "Ya has respondido a esta valoración",
  SELLER_NOT_FOUND: "Usuario no encontrado",
  ALREADY_REPORTED: "Ya has denunciado esto. Lo revisará un administrador",
  CANNOT_REPORT_OWN: "No puedes denunciar algo que has escrito tú",
  TOO_MANY_REPORTS: "Has enviado muchas denuncias seguidas. Prueba de nuevo dentro de un rato",
});
