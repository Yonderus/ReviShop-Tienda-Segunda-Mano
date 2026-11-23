import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

/**
 * Crear y comprobar los JWT de la sesión. El servidor no guarda los tokens: comprueba la **firma** (con
 * JWT_SECRET) y la **caducidad**. Si alguien cambia algo del token (p. ej. el rol), la firma deja de cuadrar.
 * Ojo: el contenido de un JWT se puede leer, así que no lleva nada sensible.
 */

// Fijo al firmar y al verificar: así no cuela un token con otro algoritmo (o con `alg: none`).
const ALGORITHM = "HS256";

/**
 * Access token: `sub` (id del usuario), `email`, `role` (slug), `jti` (id único del token, para poder revocarlo en
 * el logout) y `exp` (caducidad, a partir de JWT_ACCESS_EXPIRES_IN). Es el único JWT: el refresh token es un valor
 * aleatorio que se guarda (como hash) en la base de datos, ver utils/refreshToken.js.
 */
export function createToken({ id, email, role }) {
  // `issuedAtMs`: el `iat` estándar va en segundos, y para "cerrar las sesiones abiertas antes de ahora"
  // (`tokensValidAfter`) un token emitido en el mismo segundo tiene que poder distinguirse.
  return jwt.sign({ email, role, issuedAtMs: Date.now() }, env.JWT_SECRET, {
    algorithm: ALGORITHM,
    subject: String(id),
    jwtid: randomUUID(),
    expiresIn: env.accessTokenExpiresIn,
  });
}

/** Payload (`sub`, `email`, `role`, `jti`, `iat`, `exp`) si la firma y la caducidad son válidas; si no, lanza. */
export function verifyToken(token) {
  return jwt.verify(token, env.JWT_SECRET, { algorithms: [ALGORITHM] });
}

/** Distingue "ha caducado" de "no es válido", para dar un mensaje distinto. */
export const isTokenExpired = (error) => error instanceof jwt.TokenExpiredError;
