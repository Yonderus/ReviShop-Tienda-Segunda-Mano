import { env } from "../config/env.js";
import { REFRESH_COOKIE, SESSION_COOKIE } from "../constants/auth.constants.js";
import { verifyToken } from "./jwt.js";

/*
 * Las cookies de la sesión. Las cookies son cosa de HTTP: las usan los controllers y los middlewares; los services
 * trabajan con los tokens como texto.
 *
 * - `revishop_session`: el access token (JWT corto), `Path=/api`: va a toda la API y a la IA.
 * - `revishop_refresh`: el refresh token (opaco, 7 días), `Path=/api/auth`: solo a /auth/refresh y /auth/logout.
 *
 * Las dos `HttpOnly` y `SameSite=Strict`, y `Secure` en producción (en desarrollo la API va por http://localhost).
 * Se borran con las MISMAS opciones con que se crearon: si no coinciden (sobre todo el `path`), el navegador no las
 * borra.
 */

const sessionOptions = () => ({ ...SESSION_COOKIE.OPTIONS, secure: env.isProduction });
const refreshOptions = () => ({ ...REFRESH_COOKIE.OPTIONS, secure: env.isProduction });

/** La cookie del access, para que dure exactamente lo que le queda al token. Devuelve cuándo caduca. */
export function setSessionCookie(res, token) {
  const expiresAt = new Date(verifyToken(token).exp * 1000);
  res.cookie(SESSION_COOKIE.NAME, token, { ...sessionOptions(), maxAge: expiresAt.getTime() - Date.now() });
  return expiresAt;
}

export function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE.NAME, sessionOptions());
}

/** La cookie del refresh, hasta que caduque ese refresh. */
export function setRefreshCookie(res, token, expiresAt) {
  res.cookie(REFRESH_COOKIE.NAME, token, { ...refreshOptions(), maxAge: new Date(expiresAt).getTime() - Date.now() });
}

export function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE.NAME, refreshOptions());
}

/** Las dos a la vez: login, refresh y nada más. Devuelve cuándo caduca el access (para el front). */
export function setAuthCookies(res, { accessToken, refresh }) {
  setRefreshCookie(res, refresh.token, refresh.expiresAt);
  return setSessionCookie(res, accessToken);
}

/** Las dos a la vez: logout, logout-all y un refresh que ya no vale. */
export function clearAuthCookies(res) {
  clearSessionCookie(res);
  clearRefreshCookie(res);
}

/** El access de la cookie, o null si no hay. */
export const sessionToken = (req) => req.cookies?.[SESSION_COOKIE.NAME] || null;

/** El refresh de la cookie, o null si no hay (solo llega a las rutas de /api/auth). */
export const refreshToken = (req) => req.cookies?.[REFRESH_COOKIE.NAME] || null;
