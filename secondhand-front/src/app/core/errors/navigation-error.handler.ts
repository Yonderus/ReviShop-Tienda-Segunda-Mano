import { inject } from '@angular/core';
import { NavigationError, Router } from '@angular/router';
import { AlertService } from '../services/alert.service';
import { APP_ERROR_MESSAGES, claimAutoReload, isChunkLoadError } from './app-errors';

/**
 * Una navegación que falla (`withNavigationErrorHandler`, corre en contexto de inyección). Lo típico: la
 * página se carga bajo demanda y su archivo no llega. Sin esto, pulsabas un enlace y no pasaba nada.
 *
 * - Sin conexión: se avisa (recargar no serviría de nada).
 * - Con conexión: casi siempre es una versión nueva (los archivos antiguos ya no existen). Se recarga una vez
 *   directamente en la página a la que ibas; si vuelve a fallar enseguida, se avisa y decide el usuario.
 * - Cualquier otro fallo: se registra y se avisa.
 */
export function handleNavigationError(navigation: NavigationError): void {
  const alert = inject(AlertService);
  const router = inject(Router);
  const { error, url } = navigation;

  if (isChunkLoadError(error)) {
    if (navigator.onLine && claimAutoReload()) {
      location.assign(url);
      return;
    }
    void alert
      .confirm({
        title: APP_ERROR_MESSAGES.chunkTitle,
        text: navigator.onLine ? APP_ERROR_MESSAGES.chunk : APP_ERROR_MESSAGES.offline,
        confirmText: APP_ERROR_MESSAGES.reload,
        cancelText: APP_ERROR_MESSAGES.stay,
      })
      // Si falló la primera navegación (justo tras abrir o recargar), detrás del aviso no hay ninguna página:
      // quien elige quedarse va a la tienda, que sí está cargada.
      .then((reload) => {
        if (reload) location.assign(url);
        else if (!router.navigated) void router.navigateByUrl('/');
      })
      .catch(() => undefined);
    return;
  }

  console.error(`[Navegación] ${url}`, error);
  void alert.error(APP_ERROR_MESSAGES.unexpected).catch(() => undefined);
}
