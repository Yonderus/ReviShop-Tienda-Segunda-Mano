import mongoose from "mongoose";
import {
  ALL_REVIEW_CRITERIA,
  REVIEW_COMMENT,
  REVIEW_RATING,
  REVIEW_REPLY_MAX,
  REVIEWEE_ROLES,
} from "../constants/review.constants.js";

const stars = { type: Number, min: REVIEW_RATING.MIN, max: REVIEW_RATING.MAX };

/** Las notas por criterio. Cuáles son obligatorias depende de a quién se valora (lo comprueba el service). */
const criteriaSchema = new mongoose.Schema(
  Object.fromEntries(ALL_REVIEW_CRITERIA.map((key) => [key, { ...stars, default: undefined }])),
  { _id: false },
);

/** La respuesta pública del valorado: una sola. */
const replySchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true, maxlength: REVIEW_REPLY_MAX },
    createdAt: { type: Date, required: true },
  },
  { _id: false },
);

/**
 * Review: lo que una parte de una venta opina de la otra.
 *
 * Colección `reviews`. Una por venta y por lado (índice único `saleId + reviewerId`): el comprador valora al
 * vendedor y el vendedor al comprador. Relaciones: N Review → 1 Sale · N Review → 1 User (quien valora) y 1 User
 * (el valorado).
 *
 * **Sistema ciego sin tareas programadas:** `visibleAt` dice desde cuándo es pública. La primera de una venta se
 * guarda con `visibleAt` = fin de la ventana; cuando llega la segunda, las dos pasan a `visibleAt` = ahora. Todo lo
 * público filtra `visibleAt <= ahora`, así que a las 72 h se "publica" sola, sin que nadie la toque.
 *
 * No se edita ni se borra: sin isActive, soft delete ni slug. La moderación la oculta (`hiddenAt`).
 */
const reviewSchema = new mongoose.Schema(
  {
    // ── Relaciones ──
    saleId: { type: mongoose.Schema.Types.ObjectId, ref: "Sale", required: true },
    reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    revieweeId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // ── Datos ──
    revieweeRole: { type: String, enum: REVIEWEE_ROLES, required: true },
    rating: { ...stars, required: true },
    criteria: { type: criteriaSchema, required: true },
    comment: { type: String, trim: true, maxlength: REVIEW_COMMENT.MAX, default: null },
    reply: { type: replySchema, default: null },
    // "Compró: Bici de montaña 29"" (copiado de la venta, que a su vez lo copió del anuncio).
    snapshot: {
      type: new mongoose.Schema({ productTitle: { type: String, required: true }, productSlug: { type: String, required: true } }, { _id: false }),
      required: true,
    },

    // ── Visibilidad ──
    visibleAt: { type: Date, required: true },
    // Moderación: oculta de lo público y de las medias. Se puede restaurar.
    hiddenAt: { type: Date, default: null },
    hiddenReason: { type: String, trim: true, maxlength: 300, default: null },
  },
  { collection: "reviews", timestamps: true, id: false },
);

// ── Índices ──
reviewSchema.index({ saleId: 1, reviewerId: 1 }, { unique: true });
// El perfil público: las visibles de un usuario en un papel, las más recientes primero (y sus medias).
reviewSchema.index({ revieweeId: 1, revieweeRole: 1, visibleAt: -1 });
reviewSchema.index({ reviewerId: 1 });

export const Review = mongoose.model("Review", reviewSchema);
