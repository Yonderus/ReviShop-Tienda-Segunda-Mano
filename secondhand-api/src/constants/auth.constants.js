/** Mensajes de autenticación y autorización: los mismos en el login, los middlewares y los services. */
export const AUTH_MESSAGES = Object.freeze({
  BAD_CREDENTIALS: "Email o contraseña incorrectos",
  CANNOT_LOG_IN: "Tu cuenta no puede iniciar sesión. Contacta con el administrador",
  TOKEN_MISSING: "Necesitas iniciar sesión",
  TOKEN_EXPIRED: "Tu sesión ha caducado. Vuelve a iniciar sesión",
  TOKEN_REVOKED: "Tu sesión se ha cerrado. Vuelve a iniciar sesión",
  FORBIDDEN: "No tienes permiso para esto",
  TOO_MANY_ATTEMPTS: "Demasiados intentos de inicio de sesión. Prueba de nuevo dentro de unos minutos",
  ORIGIN_NOT_ALLOWED: "Origen no permitido",
  // Refresh token
  REFRESH_MISSING: "Necesitas iniciar sesión",
  REFRESH_INVALID: "Tu sesión ha caducado. Vuelve a iniciar sesión",
  REFRESH_REUSED: "Tu sesión se ha cerrado por seguridad. Vuelve a iniciar sesión",
  REFRESH_RACE: "La sesión ya se ha renovado",
  TOO_MANY_REFRESHES: "Demasiadas renovaciones de sesión. Prueba de nuevo dentro de unos minutos",
});

/**
 * La cookie de la sesión: lleva el JWT y el navegador la envía sola a la API.
 * - `httpOnly`: JavaScript no puede leerla (un XSS no puede robar el token).
 * - `sameSite: "strict"`: no viaja en peticiones que vienen de otra web (defensa principal contra CSRF).
 * - `path: "/api"`: solo va a la API, no con el HTML ni las imágenes.
 * `secure` (solo por HTTPS) y `maxAge` (lo que le queda al token) se ponen en `utils/sessionCookie.js`.
 */
export const SESSION_COOKIE = Object.freeze({
  NAME: "revishop_session",
  OPTIONS: Object.freeze({ httpOnly: true, sameSite: "strict", path: "/api" }),
});

/**
 * Límite de intentos de login fallidos (los correctos no cuentan), contra quien prueba contraseñas.
 * - Por IP y email: frena a quien prueba muchas contraseñas contra una cuenta.
 * - Solo por IP: frena a quien prueba una contraseña contra muchos emails.
 */
export const LOGIN_RATE_LIMIT = Object.freeze({
  WINDOW_MS: 15 * 60 * 1000,
  PER_ACCOUNT: 10,
  PER_IP: 50,
});

/**
 * La cookie del refresh token. Las mismas defensas que la del access y, además, `path: "/api/auth"`: el navegador
 * solo la envía a /api/auth/refresh y /api/auth/logout, nunca al resto de la API (el token más valioso viaja lo
 * mínimo). `secure` y `maxAge` se ponen en `utils/sessionCookie.js`.
 */
export const REFRESH_COOKIE = Object.freeze({
  NAME: "revishop_refresh",
  OPTIONS: Object.freeze({ httpOnly: true, sameSite: "strict", path: "/api/auth" }),
});

/** Por qué se revocó una sesión de refresh (colección `refresh_tokens`). */
export const REFRESH_REVOKE_REASON = Object.freeze({
  LOGOUT: "logout",
  LOGOUT_ALL: "logout_all",
  /** Se presentó un refresh ya usado fuera del margen: hay dos copias, una puede ser robada. */
  REUSE: "reuse",
  PASSWORD_CHANGE: "password_change",
  /** Un admin suspendió, desactivó o borró la cuenta. */
  ADMIN: "admin",
  /** La cuenta ya no puede entrar (detectado al refrescar). */
  ACCOUNT_DISABLED: "account_disabled",
});
export const REFRESH_REVOKE_REASONS = Object.freeze(Object.values(REFRESH_REVOKE_REASON));

/** Límite de `POST /auth/refresh` por IP (todas cuentan, también las correctas). */
export const REFRESH_RATE_LIMIT = Object.freeze({
  WINDOW_MS: 15 * 60 * 1000,
  PER_IP: 60,
});

/** Por qué se revocó un token (colección `revoked_tokens`). */
export const REVOKE_REASON = Object.freeze({
  LOGOUT: "logout",
  PASSWORD_CHANGE: "password_change",
  ADMIN: "admin",
});
export const REVOKE_REASONS = Object.freeze(Object.values(REVOKE_REASON));
