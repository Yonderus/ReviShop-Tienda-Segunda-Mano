/** Mensajes de autenticación y autorización: los mismos en el login, los middlewares y los services. */
export const AUTH_MESSAGES = Object.freeze({
  BAD_CREDENTIALS: "Email o contraseña incorrectos",
  CANNOT_LOG_IN: "Tu cuenta no puede iniciar sesión. Contacta con el administrador",
  TOKEN_MISSING: "Necesitas iniciar sesión",
  TOKEN_EXPIRED: "Tu sesión ha caducado. Vuelve a iniciar sesión",
  TOKEN_REVOKED: "Tu sesión se ha cerrado. Vuelve a iniciar sesión",
  FORBIDDEN: "No tienes permiso para esto",
});

/** Por qué se revocó un token (colección `revoked_tokens`). */
export const REVOKE_REASON = Object.freeze({
  LOGOUT: "logout",
  PASSWORD_CHANGE: "password_change",
  ADMIN: "admin",
});
export const REVOKE_REASONS = Object.freeze(Object.values(REVOKE_REASON));
