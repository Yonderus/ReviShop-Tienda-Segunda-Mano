export const APP_NAME = 'Revishop';

export const LOADER_SHOW_DELAY_MS = 180;

/** Dónde se guarda el JWT de la sesión (solo el token: el usuario sale siempre de /auth/me). */
export const AUTH_TOKEN_KEY = 'revishop.token';

/** Errores que un formulario pinta en línea; el resto los muestra el errorInterceptor en un modal. */
export const INLINE_FORM_STATUSES: readonly number[] = [400, 409, 422];
