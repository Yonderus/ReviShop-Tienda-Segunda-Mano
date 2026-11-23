import { RefreshToken } from "../models/refreshToken.model.js";

export const refreshTokenRepository = {
  async create(data) {
    return (await RefreshToken.create(data)).toObject();
  },

  findByHash(tokenHash) {
    return RefreshToken.findOne({ tokenHash }).lean();
  },

  /**
   * Marca un refresh como usado, pero solo si nadie lo ha usado ni revocado antes. Es atómico: si llegan dos
   * peticiones a la vez con el mismo token, solo una "gana" (true) y la otra se trata como reutilización.
   */
  async claim(id, at = new Date()) {
    const { modifiedCount } = await RefreshToken.updateOne({ _id: id, usedAt: null, revokedAt: null }, { $set: { usedAt: at } });
    return modifiedCount === 1;
  },

  setReplacedBy(id, replacedBy) {
    return RefreshToken.updateOne({ _id: id }, { $set: { replacedBy } });
  },

  /** Revoca todos los refresh vivos de una sesión. Devuelve cuántos. */
  async revokeFamily(familyId, reason, at = new Date()) {
    const { modifiedCount } = await RefreshToken.updateMany({ familyId, revokedAt: null }, { $set: { revokedAt: at, revokeReason: reason } });
    return modifiedCount;
  },

  /** Revoca todas las sesiones de un usuario. Devuelve cuántos refresh. */
  async revokeAllForUser(userId, reason, at = new Date()) {
    const { modifiedCount } = await RefreshToken.updateMany({ userId, revokedAt: null }, { $set: { revokedAt: at, revokeReason: reason } });
    return modifiedCount;
  },

  /** Solo el seed: vaciar la colección. */
  deleteAll() {
    return RefreshToken.deleteMany({});
  },
};
