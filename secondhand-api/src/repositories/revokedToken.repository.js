import { RevokedToken } from "../models/revokedToken.model.js";

export const revokedTokenRepository = {
  /** Upsert: revocar dos veces el mismo token (cerrar sesión dos veces) no falla. */
  revoke({ jti, userId, reason, expiresAt }) {
    return RevokedToken.updateOne({ jti }, { $setOnInsert: { jti, userId, reason, expiresAt } }, { upsert: true });
  },

  async isRevoked(jti) {
    return (await RevokedToken.exists({ jti })) !== null;
  },
};
