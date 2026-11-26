import mongoose from "mongoose";
import { Review } from "../models/review.model.js";

const WITH_DELETED = { withDeleted: true };
// Quien valoró: lo justo para decidir si se enseña su nombre (si su cuenta sigue en pie). Nunca el email.
const REVIEWER_POPULATE = { path: "reviewerId", select: "name slug isActive status deletedAt", options: WITH_DELETED };

const toId = (id) => new mongoose.Types.ObjectId(String(id));

/** Lo público de un usuario en un papel: ya visible (fin del sistema ciego) y no ocultado por moderación. */
const publicFilter = (userId, role, now) => ({ revieweeId: toId(userId), revieweeRole: role, visibleAt: { $lte: now }, hiddenAt: null });

export const reviewRepository = {
  create(data) {
    return Review.create(data);
  },

  findRawById(id) {
    return Review.findById(id).lean();
  },

  countBySale(saleId) {
    return Review.countDocuments({ saleId });
  },

  /** Las valoraciones de varias ventas (para enseñarlas en Mi actividad y saber cuáles faltan). */
  findBySales(saleIds) {
    return Review.find({ saleId: { $in: saleIds } }).lean();
  },

  /**
   * Fin del sistema ciego: las dos valoraciones de la venta pasan a ser visibles ya. Solo toca las que aún no lo
   * eran (llamarla dos veces no cambia nada).
   */
  revealSale(saleId, now) {
    return Review.updateMany({ saleId, visibleAt: { $gt: now } }, { visibleAt: now });
  },

  /** La respuesta, una sola vez: solo se guarda si aún no había (aunque lleguen dos a la vez). Devuelve la valoración o null. */
  setReplyIfNone(id, reply) {
    return Review.findOneAndUpdate({ _id: id, reply: null }, { reply }, { new: true }).lean();
  },

  /**
   * Las medias de un usuario en un papel (solo lo público): nota media, cuántas, distribución de 1 a 5 y media de
   * cada criterio. `$avg` ignora los criterios que no existen (al comprador no se le pregunta `asDescribed`).
   */
  async summaryFor(userId, role, now) {
    const [row] = await Review.aggregate([
      { $match: publicFilter(userId, role, now) },
      {
        $group: {
          _id: null,
          average: { $avg: "$rating" },
          count: { $sum: 1 },
          ...Object.fromEntries([1, 2, 3, 4, 5].map((star) => [`s${star}`, { $sum: { $cond: [{ $eq: ["$rating", star] }, 1, 0] } }])),
          asDescribed: { $avg: "$criteria.asDescribed" },
          communication: { $avg: "$criteria.communication" },
          punctuality: { $avg: "$criteria.punctuality" },
        },
      },
    ]);
    return row ?? null;
  },

  /** Una página de valoraciones públicas, las más recientes primero; `rating` filtra por estrellas. */
  async findPublicPage(userId, role, { rating, skip, limit }, now) {
    const filter = { ...publicFilter(userId, role, now), ...(rating && { rating }) };
    const [items, total] = await Promise.all([
      Review.find(filter).sort({ visibleAt: -1, _id: -1 }).skip(skip).limit(limit).populate(REVIEWER_POPULATE).lean(),
      Review.countDocuments(filter),
    ]);
    return { items, total };
  },
};
