/** Mensajes de autenticación y autorización: los mismos en el login, los middlewares y los services. */
export const AUTH_MESSAGES = Object.freeze({
  BAD_CREDENTIALS: "Email o contraseña incorrectos",
  CANNOT_LOG_IN: "Tu cuenta no puede iniciar sesión. Contacta con el administrador",
  TOKEN_MISSING: "Necesitas iniciar sesión",
  TOKEN_EXPIRED: "Tu sesión ha caducado. Vuelve a iniciar sesión",
  TOKEN_REVOKED: "Tu sesión se ha cerrado. Vuelve a iniciar sesión",
  FORBIDDEN: "No tienes permiso para esto",
  TOO_MANY_ATTEMPTS: "Demasiados intentos de inicio de sesión. Prueba de nuevo dentro de unos minutos",
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

/** Por qué se revocó un token (colección `revoked_tokens`). */
export const REVOKE_REASON = Object.freeze({
  LOGOUT: "logout",
  PASSWORD_CHANGE: "password_change",
  ADMIN: "admin",
});
export const REVOKE_REASONS = Object.freeze(Object.values(REVOKE_REASON));
