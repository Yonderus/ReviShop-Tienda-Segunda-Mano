import { env } from "../config/env.js";
import { SESSION_COOKIE } from "../constants/auth.constants.js";
import { verifyToken } from "./jwt.js";

/*
 * La cookie de la sesión (ver SESSION_COOKIE). Las cookies son cosa de HTTP: las usan los controllers y los
 * middlewares; los services siguen trabajando con el token como texto.
 */

// `secure` solo en producción: en desarrollo la API va por http://localhost.
const cookieOptions = () => ({ ...SESSION_COOKIE.OPTIONS, secure: env.isProduction });

/** Pone la cookie con el token, para que dure exactamente lo que le queda al token. */
export function setSessionCookie(res, token) {
  const { exp } = verifyToken(token);
  res.cookie(SESSION_COOKIE.NAME, token, { ...cookieOptions(), maxAge: exp * 1000 - Date.now() });
}

/** La borra. Con las mismas opciones que al crearla: si no coinciden, el navegador no la borra. */
export function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE.NAME, cookieOptions());
}

/** El token de la cookie, o null si no hay. */
export const sessionToken = (req) => req.cookies?.[SESSION_COOKIE.NAME] || null;
