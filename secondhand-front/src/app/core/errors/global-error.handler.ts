import { ErrorHandler, Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { ApiError } from '../models/api-error.model';
import { AlertService } from '../services/alert.service';
import { APP_ERROR_MESSAGES, isChunkLoadError } from './app-errors';

// Un mismo fallo puede repetirse en cada ciclo de detección de cambios: como mucho un aviso cada 10 s.
const ALERT_COOLDOWN_MS = 10_000;

/** zone.js envuelve las promesas rechazadas sin catch: el error de verdad está en `rejection`. */
const unwrap = (error: unknown): unknown =>
  error && typeof error === 'object' && 'rejection' in error ? (error as { rejection: unknown }).rejection : error;

/**
 * Los errores de JavaScript que nadie ha capturado (en una plantilla, un evento, una promesa…). Sin esto solo
 * salían en la consola y la pantalla se quedaba a medias sin avisar. Se registran siempre y se avisa al
 * usuario con la opción de recargar.
 *
 * Los `ApiError` no se avisan otra vez: el errorInterceptor ya los ha mostrado (o la pantalla los pinta).
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly alert = inject(AlertService);
  private lastAlertAt = 0;

  handleError(error: unknown): void {
    const cause = unwrap(error);

    if (cause instanceof ApiError) {
      if (!environment.production) console.warn('[ApiError sin capturar]', cause);
      return;
    }

    // Una página que no se pudo descargar: el router también la pasa por aquí, pero ya la ha tratado
    // handleNavigationError, que sabe a qué página ibas (aquí solo se recargaría la actual). Solo se registra.
    if (isChunkLoadError(cause)) {
      console.warn('[Página no descargada]', cause);
      return;
    }

    console.error(error);

    const now = Date.now();
    if (now - this.lastAlertAt < ALERT_COOLDOWN_MS) return;
    this.lastAlertAt = now;

    void this.alert
      .confirm({
        title: APP_ERROR_MESSAGES.unexpectedTitle,
        text: APP_ERROR_MESSAGES.unexpected,
        confirmText: APP_ERROR_MESSAGES.reload,
        cancelText: APP_ERROR_MESSAGES.stay,
      })
      .then((reload) => reload && location.reload())
      // Si ni siquiera se puede mostrar el aviso (p. ej. sin conexión para cargar SweetAlert2), no se insiste:
      // un catch aquí evita que el propio aviso vuelva a entrar en este manejador.
      .catch(() => undefined);
  }
}
