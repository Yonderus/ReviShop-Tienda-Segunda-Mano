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
 * Token de la sesión: `sub` (id del usuario), `email`, `role` (slug), `jti` (id único del token, para poder
 * revocarlo en el logout) y `exp` (caducidad, a partir de JWT_EXPIRES_IN).
 */
export function createToken({ id, email, role }) {
  return jwt.sign({ email, role }, env.JWT_SECRET, {
    algorithm: ALGORITHM,
    subject: String(id),
    jwtid: randomUUID(),
    expiresIn: env.JWT_EXPIRES_IN,
  });
}

/** Payload (`sub`, `email`, `role`, `jti`, `iat`, `exp`) si la firma y la caducidad son válidas; si no, lanza. */
export function verifyToken(token) {
  return jwt.verify(token, env.JWT_SECRET, { algorithms: [ALGORITHM] });
}

/** Distingue "ha caducado" de "no es válido", para dar un mensaje distinto. */
export const isTokenExpired = (error) => error instanceof jwt.TokenExpiredError;
