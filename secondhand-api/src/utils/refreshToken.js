import { createHash, randomBytes } from "node:crypto";

/*
 * El refresh token NO es un JWT: es un valor aleatorio sin nada que leer. Así solo vale si está en la base de datos
 * (se puede revocar al momento, rotar y detectar si alguien lo reutiliza), cosa que un JWT de 7 días no permite.
 *
 * En la base de datos se guarda solo su hash: si alguien la copiara, no tendría ninguna sesión válida. Basta con
 * SHA-256 (y no Argon2, como las contraseñas): el token tiene 256 bits aleatorios, no se puede adivinar probando.
 */

/** 32 bytes aleatorios en base64url (43 caracteres, sin símbolos raros para la cookie). */
export const generateRefreshToken = () => randomBytes(32).toString("base64url");

/** El hash que se guarda y por el que se busca (hex de 64 caracteres). */
export const hashRefreshToken = (token) => createHash("sha256").update(String(token)).digest("hex");
