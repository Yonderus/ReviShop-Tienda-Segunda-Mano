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
import { INLINE_ERROR_STATUSES, SKIP_ERROR_ALERT } from '../config/api.tokens';
import { ApiError } from '../models/api-error.model';
import { isApiFailure, isApiSuccess } from '../models/api-response.model';
import { AlertService } from '../services/alert.service';

const MESSAGES = {
  network: 'No hemos podido conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.',
  timeout: 'El servidor está tardando demasiado en responder. Inténtalo de nuevo en unos segundos.',
  invalidResponse: 'Hemos recibido una respuesta inesperada del servidor. Inténtalo de nuevo.',
  validation: 'Algunos datos no son válidos. Revísalos e inténtalo de nuevo.',
  notFound: 'No hemos encontrado lo que buscabas.',
  conflict: 'Ya existe un producto con ese título.',
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
  const backendMessage = isApiFailure(error.error) ? error.error.message : undefined;

  if (status === 0) return new ApiError('network', MESSAGES.network, 0);
  if (status === 400 || status === 422) {
    return new ApiError('validation', MESSAGES.validation, status, backendMessage ? [backendMessage] : []);
  }
  if (status === 404) return new ApiError('http', MESSAGES.notFound, status);
  if (status === 409) return new ApiError('http', MESSAGES.conflict, status);
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

  return next(req).pipe(
    timeout(environment.requestTimeoutMs),
    map((event) => assertValidEnvelope(req, event)),
    catchError((raw: unknown) => {
      const error = normalizeError(raw);

      if (!environment.production) {
        console.error(`[API] ${req.method} ${req.urlWithParams}`, raw);
      }

      const handledInline =
        req.context.get(SKIP_ERROR_ALERT) || req.context.get(INLINE_ERROR_STATUSES).includes(error.status);
      if (!handledInline) void alert.error(error.message, error.details);

      return throwError(() => error);
    }),
  );
};
