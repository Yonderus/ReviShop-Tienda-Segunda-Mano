import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { REFRESH_RETRIED, SENT_WITH_SESSION } from '../config/api.tokens';
import { AuthStore } from './auth.store';

/** Las rutas de la sesión tratan su 401 ellas (credenciales malas, sin refresh…): renovar ahí no tiene sentido. */
const isAuthRoute = (url: string): boolean => /\/auth\//.test(new URL(url, 'http://x').pathname);

/**
 * El access token ha caducado (401) → se renueva la sesión y se reintenta la petición, sin que el usuario lo note.
 *
 * - Solo si la petición salió con sesión (`SENT_WITH_SESSION`), no es de `/auth/` y no es ya un reintento.
 * - **Una renovación para todos**: si fallan cinco peticiones a la vez, `AuthStore.refresh()` hace una sola petición
 *   y las cinco esperan su resultado (single-flight).
 * - **Un solo reintento**: si vuelve a dar 401, sube como siempre (sin bucles).
 * - Si no se puede renovar, deja pasar el 401 ORIGINAL: el errorInterceptor cierra la sesión, avisa y lleva al login.
 * - `race` (otra pestaña acaba de renovar): las cookies nuevas ya están en el navegador, así que también se reintenta.
 *
 * Va el ÚLTIMO de la lista (el más cerca de la red): las respuestas recorren los interceptores al revés, así que lo
 * ve antes que el errorInterceptor. El reintento sale desde aquí directo a la red.
 */
export const refreshInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthStore);

  return next(req).pipe(
    catchError((error: unknown) => {
      const canRenew =
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        req.context.get(SENT_WITH_SESSION) &&
        !req.context.get(REFRESH_RETRIED) &&
        !isAuthRoute(req.url);
      if (!canRenew) return throwError(() => error);

      return from(auth.refresh()).pipe(
        switchMap((outcome) =>
          outcome === 'failed' ? throwError(() => error) : next(req.clone({ context: req.context.set(REFRESH_RETRIED, true) })),
        ),
      );
    }),
  );
};
