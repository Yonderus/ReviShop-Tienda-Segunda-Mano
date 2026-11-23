import mongoose from "mongoose";
import { REFRESH_REVOKE_REASONS } from "../constants/auth.constants.js";

/**
 * RefreshToken: las sesiones largas (los refresh tokens), uno por fila.
 *
 * Colección `refresh_tokens`. Cada login abre una **familia** (`familyId`): una sesión en un navegador. Cada vez que
 * se usa un refresh, se marca como usado (`usedAt`, `replacedBy`) y se emite otro de la misma familia (rotación).
 * Si alguien presenta uno ya usado (fuera del margen de gracia), hay dos copias del token: se revoca toda la familia.
 * Relaciones: N RefreshToken → 1 User.
 *
 * Nunca se guarda el token, solo su hash (`tokenHash`). Como `revoked_tokens`, es un registro técnico: sin isActive,
 * soft delete ni slug. Mongo borra cada fila sola cuando caduca (índice TTL), así que la colección no crece sin límite.
 */
const refreshTokenSchema = new mongoose.Schema(
  {
    // ── Relaciones ──
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    // El refresh que sustituyó a este al rotar.
    replacedBy: { type: mongoose.Schema.Types.ObjectId, ref: "RefreshToken", default: null },

    // ── Datos ──
    // La sesión (un login en un navegador): todos sus refresh comparten familia y se revocan juntos.
    familyId: { type: String, required: true, index: true },
    // SHA-256 del token (hex). Es por lo que se busca: el token en claro solo lo tiene la cookie.
    tokenHash: { type: String, required: true, unique: true },
    // Cuándo caduca este refresh. Índice TTL: llegada la fecha, Mongo borra la fila.
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
    // Tope de la familia (login + REFRESH_SESSION_MAX_DAYS). Rotar no lo alarga.
    sessionExpiresAt: { type: Date, required: true },
    // Cuándo se usó para rotar. Uno usado que vuelve a aparecer = reutilización.
    usedAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
    revokeReason: { type: String, enum: [...REFRESH_REVOKE_REASONS, null], default: null },
    // Para una futura pantalla "Mis sesiones" (qué navegador). Recortado: lo manda el cliente.
    userAgent: { type: String, maxlength: 300, default: null },
  },
  { collection: "refresh_tokens", timestamps: { createdAt: true, updatedAt: false } },
);

export const RefreshToken = mongoose.model("RefreshToken", refreshTokenSchema);
