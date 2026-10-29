import mongoose from "mongoose";
import { REVOKE_REASONS } from "../constants/auth.constants.js";

/**
 * RevokedToken — la blacklist del logout: tokens que ya no valen aunque no hayan caducado.
 *
 * Colección `revoked_tokens`. Un JWT es válido hasta que caduca y el servidor no lo guarda, así que no
 * puede "borrarlo": al cerrar sesión se apunta aquí su `jti` y el middleware lo consulta en cada petición.
 * Relaciones: N RevokedToken → 1 User.
 *
 * Excepción a "todas las colecciones": sin isActive, soft delete ni slug. Es un registro técnico que Mongo
 * borra solo cuando el token habría caducado (índice TTL), así que la lista nunca crece sin límite.
 */
const revokedTokenSchema = new mongoose.Schema(
  {
    // ── Relaciones ──
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    // ── Datos ──
    // Id único del token (claim `jti`).
    jti: { type: String, required: true, unique: true },
    reason: { type: String, required: true, enum: REVOKE_REASONS },
    // El `exp` del token. Índice TTL: cuando llega esta fecha, Mongo borra la fila (ya no hace falta).
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  },
  { collection: "revoked_tokens", timestamps: { createdAt: true, updatedAt: false } }
);

export const RevokedToken = mongoose.model("RevokedToken", revokedTokenSchema);
