import argon2 from "argon2";
// Solo para la migración: comprobar las contraseñas que se guardaron con bcrypt y pasarlas a Argon2 al iniciar
// sesión. Cuando no quede ningún hash `$2…` en la base, se borra (y la dependencia `bcryptjs`).
import bcrypt from "bcryptjs";

/**
 * Argon2id: el algoritmo recomendado hoy (OWASP). Además de lento, gasta memoria, lo que encarece mucho los
 * ataques con GPU. Parámetros mínimos de OWASP: 19 MiB, 2 pasadas, 1 hilo.
 */
const ARGON2_OPTIONS = Object.freeze({ type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });

const isBcryptHash = (hash) => /^\$2[aby]\$/.test(hash);

/** Hash de una contraseña. Lo usan el seed y el service de usuarios. */
export const hashPassword = (plain) => argon2.hash(plain, ARGON2_OPTIONS);

/** ¿Es esta la contraseña? Acepta hashes Argon2 y, mientras queden, bcrypt. Un hash raro o vacío es `false`. */
export async function verifyPassword(plain, hash) {
  if (!hash) return false;
  if (isBcryptHash(hash)) return bcrypt.compare(plain, hash);
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}

/** `true` si hay que volver a guardarla: está en bcrypt o se hizo con parámetros más débiles que los de ahora. */
export const needsRehash = (hash) => isBcryptHash(hash) || argon2.needsRehash(hash, ARGON2_OPTIONS);
