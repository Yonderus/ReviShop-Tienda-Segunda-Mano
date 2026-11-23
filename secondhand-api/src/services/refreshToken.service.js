import { randomUUID } from "node:crypto";
import { env } from "../config/env.js";
import { AUTH_MESSAGES, REFRESH_REVOKE_REASON } from "../constants/auth.constants.js";
import { refreshTokenRepository } from "../repositories/refreshToken.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { ConflictError, UnauthorizedError } from "../utils/AppError.js";
import { generateRefreshToken, hashRefreshToken } from "../utils/refreshToken.js";
import { userService } from "./user.service.js";

/*
 * Las sesiones largas (refresh tokens). Ver ESTRUCTURACION_REFRESH_TOKEN.md, §4.
 *
 * - issue:  emite uno (al hacer login abre una familia nueva).
 * - rotate: lo cambia por otro de la misma familia. Un refresh solo sirve UNA vez: si aparece uno ya usado, hay dos
 *           copias (una puede ser robada) y se corta la sesión entera, salvo dentro del margen de gracia, que es lo
 *           que pasa cuando dos pestañas refrescan a la vez (comparten cookies).
 * - revoke: logout (su familia), logout-all y suspensiones (todas las del usuario).
 *
 * Este service no sabe nada de cookies ni del access token: eso es del auth.service y del controller.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

const minDate = (a, b) => (a < b ? a : b);
const trimUserAgent = (userAgent) => (userAgent ? String(userAgent).slice(0, 300) : null);

/** Crea la fila (con el hash) y devuelve el token en claro, que solo irá a la cookie. */
async function createRefresh({ userId, familyId, sessionExpiresAt, userAgent, now }) {
  const token = generateRefreshToken();
  const expiresAt = minDate(new Date(now.getTime() + env.REFRESH_TOKEN_TTL_DAYS * DAY_MS), sessionExpiresAt);
  const row = await refreshTokenRepository.create({
    userId,
    familyId,
    tokenHash: hashRefreshToken(token),
    expiresAt,
    sessionExpiresAt,
    userAgent: trimUserAgent(userAgent),
  });
  return { token, expiresAt, familyId, id: row._id };
}

/** Un refresh ya usado que vuelve a aparecer: ¿dos pestañas a la vez (margen de gracia) o una copia robada? */
async function handleReuse(row, now) {
  const sinceUse = now.getTime() - new Date(row.usedAt).getTime();
  if (sinceUse <= env.REFRESH_REUSE_GRACE_SECONDS * 1000) {
    // La otra pestaña ya lo ha renovado y el navegador ya tiene las cookies nuevas: que reintente.
    throw new ConflictError(AUTH_MESSAGES.REFRESH_RACE);
  }
  const revoked = await refreshTokenRepository.revokeFamily(row.familyId, REFRESH_REVOKE_REASON.REUSE, now);
  console.warn(`[auth] refresh reutilizado: sesión ${row.familyId} del usuario ${row.userId} revocada (${revoked} tokens)`);
  throw new UnauthorizedError(AUTH_MESSAGES.REFRESH_REUSED);
}

export const refreshTokenService = {
  /**
   * Emite un refresh. Sin `familyId`, abre una sesión nueva (login) con tope `REFRESH_SESSION_MAX_DAYS`.
   * @returns {Promise<{ token: string, expiresAt: Date, familyId: string }>}
   */
  async issue(userId, { userAgent = null, familyId = null, sessionExpiresAt = null } = {}) {
    const now = new Date();
    const { token, expiresAt, familyId: family } = await createRefresh({
      userId,
      familyId: familyId ?? randomUUID(),
      sessionExpiresAt: sessionExpiresAt ?? new Date(now.getTime() + env.REFRESH_SESSION_MAX_DAYS * DAY_MS),
      userAgent,
      now,
    });
    return { token, expiresAt, familyId: family };
  },

  /**
   * Cambia un refresh por otro de la misma familia. Comprueba, por este orden: que exista, que no esté revocado ni
   * caducado, que no se haya usado ya (reutilización → 409 dentro del margen; si no, familia revocada y 401) y que la
   * cuenta siga pudiendo entrar. Devuelve el refresh nuevo y el usuario con su rol actual (para el access token).
   *
   * @returns {Promise<{ refresh: { token: string, expiresAt: Date, familyId: string }, user: object, role: object }>}
   */
  async rotate(token, { userAgent = null } = {}) {
    if (!token) throw new UnauthorizedError(AUTH_MESSAGES.REFRESH_MISSING);
    const now = new Date();
    const row = await refreshTokenRepository.findByHash(hashRefreshToken(token));

    if (!row || row.revokedAt) throw new UnauthorizedError(AUTH_MESSAGES.REFRESH_INVALID);
    // El TTL de Mongo no es inmediato (pasa cada ~60 s): la caducidad se comprueba aquí siempre.
    if (row.expiresAt <= now || row.sessionExpiresAt <= now) throw new UnauthorizedError(AUTH_MESSAGES.REFRESH_INVALID);
    if (row.usedAt) return handleReuse(row, now);

    // La cuenta puede haber cambiado desde el login (suspendida, desactivada, borrada, sin rol).
    let user;
    let role;
    try {
      user = await userRepository.findRawById(row.userId);
      role = await userService.assertCanLogIn(user);
    } catch {
      await refreshTokenRepository.revokeFamily(row.familyId, REFRESH_REVOKE_REASON.ACCOUNT_DISABLED, now);
      throw new UnauthorizedError(AUTH_MESSAGES.CANNOT_LOG_IN);
    }

    // Atómico: si otra petición con el mismo token se ha adelantado, esta lo trata como reutilización.
    if (!(await refreshTokenRepository.claim(row._id, now))) {
      return handleReuse({ ...row, usedAt: now }, now);
    }

    const next = await createRefresh({
      userId: row.userId,
      familyId: row.familyId,
      sessionExpiresAt: row.sessionExpiresAt,
      userAgent: userAgent ?? row.userAgent,
      now,
    });
    await refreshTokenRepository.setReplacedBy(row._id, next.id);

    return { refresh: { token: next.token, expiresAt: next.expiresAt, familyId: next.familyId }, user, role };
  },

  /** Logout: revoca la sesión a la que pertenece este refresh. No falla si no existe (logout idempotente). */
  async revokeFamilyOf(token, reason = REFRESH_REVOKE_REASON.LOGOUT) {
    if (!token) return 0;
    const row = await refreshTokenRepository.findByHash(hashRefreshToken(token));
    return row ? refreshTokenRepository.revokeFamily(row.familyId, reason) : 0;
  },

  /** Todas las sesiones de un usuario (logout-all, suspensión por el admin, cambio de contraseña). */
  revokeAllForUser(userId, reason) {
    return refreshTokenRepository.revokeAllForUser(userId, reason);
  },
};
