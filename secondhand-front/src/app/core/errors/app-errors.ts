/** Mensajes y utilidades de los errores que no vienen de la API (los de la API los traduce el errorInterceptor). */
export const APP_ERROR_MESSAGES = {
  unexpectedTitle: 'Algo ha fallado en la página',
  unexpected: 'Ha ocurrido un error inesperado. Puedes seguir, pero si algo no funciona bien, recarga la página.',
  chunkTitle: 'No hemos podido cargar la página',
  chunk: 'Puede que se haya publicado una versión nueva de Revishop. Recarga para continuar.',
  offline: 'No hay conexión a internet. Comprueba tu conexión y vuelve a intentarlo.',
  reload: 'Recargar la página',
  stay: 'Seguir aquí',
} as const;

/**
 * Error al descargar una parte de la app (las páginas se cargan bajo demanda): sin conexión, o porque se ha
 * publicado una versión nueva y los archivos antiguos ya no existen. Cada navegador lo dice a su manera.
 */
const CHUNK_LOAD_ERROR = /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|ChunkLoadError|Loading chunk [\w-]+ failed/i;

export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error ?? '');
  return CHUNK_LOAD_ERROR.test(message);
}

// Recargar arregla el caso "versión nueva", pero si el archivo sigue sin llegar no hay que recargar en bucle.
const RELOAD_KEY = 'revishop.chunkReloadAt';
const RELOAD_COOLDOWN_MS = 30_000;

/** ¿Se puede recargar automáticamente? Solo una vez cada 30 s (si no, se avisa y decide el usuario). */
export function claimAutoReload(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
    if (Date.now() - last < RELOAD_COOLDOWN_MS) return false;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
    return true;
  } catch {
    // Sin sessionStorage no hay forma de evitar el bucle: mejor no recargar solo.
    return false;
  }
}
