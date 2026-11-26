import mongoose from "mongoose";
import { SALE_STATUSES } from "../constants/product.constants.js";
import { LIVE_SALE_STATES, SALE_CLOSE_REASONS, SALE_STATE, SALE_STATES } from "../constants/sale.constants.js";

/**
 * Lo que se vendió, copiado al registrar la venta. Así Mi actividad (y las valoraciones) siguen diciendo qué se
 * compró aunque el anuncio se edite o se borre después.
 */
const snapshotSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true },
    // "Talla M · Azul"; null en la variante única.
    variantLabel: { type: String, default: null },
    price: { type: Number, required: true, min: 0 },
    imageUrl: { type: String, default: null },
  },
  { _id: false },
);

/**
 * Sale: un usuario le ha vendido una variante a otro.
 *
 * Colección `sales`. La registra el vendedor (`pending`) y la confirma el comprador (`confirmed`): sin las dos
 * partes no hay valoraciones, así nadie puede inventarse compradores para regalarse estrellas.
 * Relaciones: N Sale → 1 Product · N Sale → 1 ProductVariant · N Sale → 1 User (vendedor) y 1 User (comprador).
 *
 * Es un registro histórico, como un ticket: sin isActive, soft delete ni slug. Lo que cambia es su `status`.
 */
const saleSchema = new mongoose.Schema(
  {
    // ── Relaciones ──
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    variantId: { type: mongoose.Schema.Types.ObjectId, ref: "ProductVariant", required: true },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // ── Datos ──
    snapshot: { type: snapshotSchema, required: true },
    // El estado que tenía la variante antes: se le devuelve si la venta se rechaza o se cancela.
    previousVariantStatus: { type: String, enum: SALE_STATUSES, required: true },

    // ── Estado ──
    status: { type: String, enum: SALE_STATES, default: SALE_STATE.PENDING },
    // Hasta cuándo puede confirmarla el comprador (alta + SALE_CONFIRM_DAYS).
    expiresAt: { type: Date, required: true },
    confirmedAt: { type: Date, default: null },
    // Hasta cuándo se pueden valorar (confirmación + REVIEW_WINDOW_HOURS).
    reviewWindowEndsAt: { type: Date, default: null },
    // Cuándo y por qué se cerró sin confirmar.
    closedAt: { type: Date, default: null },
    closeReason: { type: String, enum: [...SALE_CLOSE_REASONS, null], default: null },
  },
  { collection: "sales", timestamps: true, id: false },
);

// ── Índices ──
// Mi actividad: las de un usuario, de las más recientes a las más antiguas.
saleSchema.index({ sellerId: 1, status: 1, createdAt: -1 });
saleSchema.index({ buyerId: 1, status: 1, createdAt: -1 });
saleSchema.index({ productId: 1, status: 1 });
// Una variante no se vende dos veces: como mucho una venta viva (pendiente o confirmada) por variante. Lo garantiza
// Mongo aunque lleguen dos peticiones a la vez; el service lo comprueba antes para dar un 409 claro.
saleSchema.index({ variantId: 1 }, { unique: true, partialFilterExpression: { status: { $in: [...LIVE_SALE_STATES] } } });

export const Sale = mongoose.model("Sale", saleSchema);
