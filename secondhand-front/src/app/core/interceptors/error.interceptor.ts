import {
  HttpErrorResponse,
  HttpEvent,
  HttpInterceptorFn,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { TimeoutError, catchError, map, throwError, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Router } from '@angular/router';
import { AuthStore } from '../auth/auth.store';
import { INLINE_ERROR_STATUSES, SENT_WITH_SESSION, SKIP_AUTH_REDIRECT, SKIP_ERROR_ALERT } from '../config/api.tokens';
import { ApiError } from '../models/api-error.model';
import { failureErrors, isApiFailure, isApiSuccess } from '../models/api-response.model';
import { AlertService } from '../services/alert.service';

const MESSAGES = {
  network: 'No hemos podido conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.',
  timeout: 'El servidor está tardando demasiado en responder. Inténtalo de nuevo en unos segundos.',
  invalidResponse: 'Hemos recibido una respuesta inesperada del servidor. Inténtalo de nuevo.',
  validation: 'Algunos datos no son válidos. Revísalos e inténtalo de nuevo.',
  unauthorized: 'Necesitas iniciar sesión.',
  forbidden: 'No tienes permiso para esto.',
  tooMany: 'Demasiados intentos. Prueba de nuevo dentro de unos minutos.',
  notFound: 'No hemos encontrado lo que buscabas.',
  conflict: 'Ya existe un registro con esos datos.',
  tooLarge: 'Lo que intentas enviar es demasiado grande.',
  unsupported: 'El formato de lo que intentas enviar no está soportado.',
  unavailable: 'El servicio no está disponible en este momento. Inténtalo de nuevo en unos segundos.',
  server: 'Algo ha fallado en el servidor. Inténtalo de nuevo más tarde.',
  generic: 'No hemos podido completar la operación. Inténtalo de nuevo.',
} as const;

const isApiRequest = (req: HttpRequest<unknown>) => req.url.startsWith(environment.apiUrl);

function assertValidEnvelope(req: HttpRequest<unknown>, event: HttpEvent<unknown>): HttpEvent<unknown> {
  if (event instanceof HttpResponse && event.status !== 204 && isApiRequest(req) && !isApiSuccess(event.body)) {
    throw new ApiError('invalid-response', MESSAGES.invalidResponse, event.status);
  }
  return event;
}

function fromHttpError(error: HttpErrorResponse): ApiError {
  const { status } = error;
  const failure = isApiFailure(error.error) ? error.error : undefined;
  const errors = failure ? failureErrors(failure) : [];

  if (status === 0) return new ApiError('network', MESSAGES.network, 0);
  if (status === 400 || status === 422) {
    // Sin errores por campo, el mensaje del backend se conserva como error general.
    const details = errors.length || !failure ? errors : [{ field: null, message: failure.message }];
    return new ApiError('validation', MESSAGES.validation, status, details);
  }
  // 401, 403 y 429: el mensaje de la API es el preciso ("Tu sesión ha caducado", "Email o contraseña incorrectos"…).
  if (status === 401) return new ApiError('http', failure?.message ?? MESSAGES.unauthorized, status);
  if (status === 403) return new ApiError('http', failure?.message ?? MESSAGES.forbidden, status);
  if (status === 429) return new ApiError('http', failure?.message ?? MESSAGES.tooMany, status);
  if (status === 404) return new ApiError('http', MESSAGES.notFound, status);
  // Hay 409 de varios tipos (título repetido, registro en la papelera…): el mensaje del backend es el preciso.
  if (status === 409) return new ApiError('http', failure?.message ?? MESSAGES.conflict, status, errors);
  // 413 (más de 100 KB), 415 (charset o compresión) y 503 (sin base de datos): la API explica qué pasa.
  if (status === 413) return new ApiError('http', failure?.message ?? MESSAGES.tooLarge, status);
  if (status === 415) return new ApiError('http', failure?.message ?? MESSAGES.unsupported, status);
  if (status === 503) return new ApiError('http', failure?.message ?? MESSAGES.unavailable, status);
  if (status >= 500) return new ApiError('http', MESSAGES.server, status);
  return new ApiError('http', MESSAGES.generic, status);
}

function normalizeError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof TimeoutError) return new ApiError('timeout', MESSAGES.timeout);
  if (error instanceof HttpErrorResponse) return fromHttpError(error);
  return ApiError.unexpected();
}

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const alert = inject(AlertService);
  const auth = inject(AuthStore);
  const router = inject(Router);

  return next(req).pipe(
    timeout(environment.requestTimeoutMs),
    map((event) => assertValidEnvelope(req, event)),
    catchError((raw: unknown) => {
      const error = normalizeError(raw);

      if (!environment.production) {
        console.error(`[API] ${req.method} ${req.urlWithParams}`, raw);
      }

      // 401 de una petición que salió con la sesión abierta: la sesión ya no vale (caducada, cerrada, cuenta
      // desactivada…). Se borra la sesión local y al login (la cookie ya la ha borrado la API). Si fallan varias
      // a la vez, solo la primera avisa: las demás ya encuentran la sesión borrada. El login, `/auth/me` y el
      // logout tratan su 401 ellos (SKIP_AUTH_REDIRECT).
      if (error.status === 401 && req.context.get(SENT_WITH_SESSION) && !req.context.get(SKIP_AUTH_REDIRECT)) {
        if (auth.isAuthenticated()) {
          auth.clearSession();
          void alert.error(error.message);
          void router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
        }
        return throwError(() => error);
      }

      const handledInline =
        req.context.get(SKIP_ERROR_ALERT) || req.context.get(INLINE_ERROR_STATUSES).includes(error.status);
      if (!handledInline) {
        const details = error.errors.map((e) => e.message).filter((message) => message !== error.message);
        void alert.error(error.message, details);
      }

      return throwError(() => error);
    }),
  );
};
