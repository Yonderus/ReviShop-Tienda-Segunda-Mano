import { LIVE_SALE_STATES, SALE_CLOSE_REASON, SALE_STATE } from "../constants/sale.constants.js";
import { Sale } from "../models/sale.model.js";

// Lo que se enseña de cada parte: nunca el email.
const PARTY_FIELDS = "name slug";
// Las ventas siguen diciendo quién era la otra parte aunque su cuenta se borre después.
const WITH_DELETED = { withDeleted: true };
const PARTIES_POPULATE = [
  { path: "sellerId", select: PARTY_FIELDS, options: WITH_DELETED },
  { path: "buyerId", select: PARTY_FIELDS, options: WITH_DELETED },
];

const LIVE = { status: { $in: [...LIVE_SALE_STATES] } };

export const saleRepository = {
  create(data) {
    return Sale.create(data);
  },

  /** Borrado físico: solo para deshacer un registro que falló a medias (no se pudo marcar la variante). */
  hardDeleteById(id) {
    return Sale.deleteOne({ _id: id });
  },

  findRawById(id) {
    return Sale.findById(id).lean();
  },

  findDetailById(id) {
    return Sale.findById(id).populate(PARTIES_POPULATE).lean();
  },

  /** La venta viva (pendiente o confirmada) de una variante, si la tiene. */
  findLiveByVariant(variantId) {
    return Sale.findOne({ variantId, ...LIVE }).lean();
  },

  /** Las de un usuario desde un lado (`field` = "sellerId" o "buyerId"), paginadas. */
  async findPageFor(field, userId, { status, skip, limit }) {
    const filter = { [field]: userId, ...(status && { status }) };
    const [items, total] = await Promise.all([
      Sale.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate(PARTIES_POPULATE).lean(),
      Sale.countDocuments(filter),
    ]);
    return { items, total };
  },

  countPendingToConfirm(buyerId, now) {
    return Sale.countDocuments({ buyerId, status: SALE_STATE.PENDING, expiresAt: { $gt: now } });
  },

  /** Confirmadas en las que participa `userId` y que aún se pueden valorar. */
  findReviewable(userId, now) {
    return Sale.find({
      $or: [{ sellerId: userId }, { buyerId: userId }],
      status: SALE_STATE.CONFIRMED,
      reviewWindowEndsAt: { $gt: now },
    }).lean();
  },

  /**
   * Cambia el estado solo si sigue pendiente y sin caducar (en una sola operación): si dos peticiones llegan a la
   * vez (el comprador confirma mientras el vendedor cancela), solo gana una. Devuelve la venta o null.
   */
  updateIfPending(id, now, changes) {
    return Sale.findOneAndUpdate({ _id: id, status: SALE_STATE.PENDING, expiresAt: { $gt: now } }, changes, { new: true }).lean();
  },

  /**
   * Caducidad sin tareas programadas: las pendientes que ya pasaron su plazo se marcan `expired` cuando alguien las
   * va a leer o a usar. `filter` acota cuáles (las de un usuario, una variante o una venta).
   */
  expireOverdue(filter, now) {
    return Sale.updateMany(
      { ...filter, status: SALE_STATE.PENDING, expiresAt: { $lte: now } },
      { status: SALE_STATE.EXPIRED, closedAt: now, closeReason: SALE_CLOSE_REASON.EXPIRED },
    );
  },

  /** Integridad: al borrar un producto o una variante, sus ventas pendientes se cancelan (las confirmadas se quedan). */
  cancelPending(filter, reason, now) {
    return Sale.updateMany({ ...filter, status: SALE_STATE.PENDING }, { status: SALE_STATE.CANCELLED, closedAt: now, closeReason: reason });
  },
};
