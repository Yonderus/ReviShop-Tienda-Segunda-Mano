/*
 * Ventas: el registro de que un usuario le ha vendido algo a otro. Es la prueba que exigen las valoraciones (sin
 * venta confirmada por el comprador, no se puede valorar).
 *
 * Ojo con el nombre: `SALE_STATUSES` (product.constants) es el estado de venta de un producto o variante
 * (disponible, reservado, vendido). Esto es el estado del REGISTRO de la venta.
 */

/**
 * - pending:   el vendedor la ha registrado y espera a que el comprador diga que sí.
 * - confirmed: el comprador la ha confirmado. Abre la ventana para valorarse.
 * - rejected:  el comprador dice que no ha sido él.
 * - cancelled: la ha cancelado el vendedor, o se ha borrado el producto o la variante, mientras estaba pendiente.
 * - expired:   nadie la confirmó a tiempo. Se marca al leer (no hay tareas programadas).
 */
export const SALE_STATE = Object.freeze({
  PENDING: "pending",
  CONFIRMED: "confirmed",
  REJECTED: "rejected",
  CANCELLED: "cancelled",
  EXPIRED: "expired",
});
export const SALE_STATES = Object.freeze(Object.values(SALE_STATE));

/** Las que ocupan la variante: no se puede registrar otra venta de ella mientras exista una de estas. */
export const LIVE_SALE_STATES = Object.freeze([SALE_STATE.PENDING, SALE_STATE.CONFIRMED]);

/** Por qué se cerró sin confirmar (para que Mi actividad lo explique). */
export const SALE_CLOSE_REASON = Object.freeze({
  BUYER_REJECTED: "buyer_rejected",
  SELLER_CANCELLED: "seller_cancelled",
  PRODUCT_DELETED: "product_deleted",
  VARIANT_DELETED: "variant_deleted",
  EXPIRED: "expired",
});
export const SALE_CLOSE_REASONS = Object.freeze(Object.values(SALE_CLOSE_REASON));

/** Desde qué lado mira el usuario su actividad (`GET /sales/mine?as=`). */
export const SALE_ROLE = Object.freeze({ SELLER: "seller", BUYER: "buyer" });
export const SALE_ROLES = Object.freeze(Object.values(SALE_ROLE));

/** Días que tiene el comprador para confirmar. */
export const SALE_CONFIRM_DAYS = 7;

/** Horas que tienen los dos para valorarse desde que el comprador confirma (la usan las valoraciones, V3). */
export const REVIEW_WINDOW_HOURS = 72;

export const SALE_PAGE = Object.freeze({ DEFAULT_LIMIT: 20, MAX_LIMIT: 50 });

/**
 * Registrar una venta busca al comprador por su email: sin límite, serviría para probar emails y saber cuáles
 * tienen cuenta. Cuentan todos los intentos (también los que fallan), por usuario.
 */
export const SALE_RATE_LIMIT = Object.freeze({ WINDOW_MS: 60 * 60 * 1000, PER_USER: 20 });

export const SALE_MESSAGES = Object.freeze({
  NOT_FOUND: "Venta no encontrada",
  // El mismo texto exista o no el email: así no se puede usar para averiguar quién tiene cuenta.
  BUYER_NOT_FOUND: "No podemos registrar la venta con ese email. Comprueba que es el de la cuenta del comprador",
  SELF_SALE: "No puedes registrar una venta a ti mismo",
  ALREADY_REGISTERED: "Esta variante ya tiene una venta registrada",
  ONLY_BUYER: "Solo el comprador puede confirmar o rechazar la venta",
  ONLY_SELLER: "Solo el vendedor puede cancelar la venta",
  NOT_PENDING: "La venta ya no está pendiente",
  HAS_LIVE_SALE: "Esta variante tiene una venta registrada: cancélala antes de cambiar su estado",
  TOO_MANY: "Has registrado muchas ventas seguidas. Prueba de nuevo dentro de un rato",
});
