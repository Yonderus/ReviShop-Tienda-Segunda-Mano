/** Condición del objeto. La usan el modelo (Mongoose) y el validador (Zod): se cambia solo aquí. */
export const PRODUCT_CONDITIONS = Object.freeze(["nuevo", "como_nuevo", "bueno", "aceptable", "mejorable"]);

/** Estado de venta, del producto y de cada variante. */
export const SALE_STATUSES = Object.freeze(["disponible", "reservado", "vendido"]);
