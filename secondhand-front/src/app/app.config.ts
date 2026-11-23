import { registerLocaleData } from '@angular/common';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import localeEs from '@angular/common/locales/es';
import { APP_INITIALIZER, ApplicationConfig, ErrorHandler, LOCALE_ID, inject, provideZoneChangeDetection } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import {
  PreloadAllModules,
  Router,
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
  withNavigationErrorHandler,
  withPreloading,
  withViewTransitions,
} from '@angular/router';
import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';
import { AuthStore } from './core/auth/auth.store';
import { refreshInterceptor } from './core/auth/refresh.interceptor';
import { GlobalErrorHandler } from './core/errors/global-error.handler';
import { handleNavigationError } from './core/errors/navigation-error.handler';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { loadingInterceptor } from './core/interceptors/loading.interceptor';
import { AlertService } from './core/services/alert.service';

registerLocaleData(localeEs, 'es-ES');

/** Las páginas que piden sesión (las de los guards `authGuard` y `adminGuard`). */
const isPrivateUrl = (url: string): boolean =>
  /^\/(admin|profile)(\/|\?|$)/.test(url) || /^\/products\/(new|[^/?]+\/edit)(\/|\?|$)/.test(url);

/**
 * Si la sesión se cierra en otra pestaña, esta se entera al momento (AuthChannel). Si está en una página privada, se
 * va al login (volviendo después a donde estaba); si está en la tienda, se queda donde está, ya sin sesión.
 */
function followSessionEndedElsewhere(): () => void {
  const auth = inject(AuthStore);
  const router = inject(Router);
  const alert = inject(AlertService);
  return () =>
    auth.onSessionEndedElsewhere(() => {
      void alert.success('Has cerrado sesión en otra pestaña');
      if (isPrivateUrl(router.url)) void router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
    });
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withViewTransitions({
        skipInitialTransition: true,
        // El navegador aborta la transición si la pestaña está oculta; sin este catch
        // la promesa rechazada deja la vista sin pintar.
        onViewTransitionCreated: ({ transition }) => {
          transition.ready.catch(() => undefined);
          transition.finished.catch(() => undefined);
          transition.updateCallbackDone.catch(() => undefined);
        },
      }),
      withPreloading(PreloadAllModules),
      // anchorScrolling: los enlaces con #fragmento (p. ej. …/edit#variantes) bajan hasta esa sección.
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
      // Una página que no se puede descargar (sin conexión o versión nueva) avisa en vez de no hacer nada.
      withNavigationErrorHandler(handleNavigationError),
    ),
    // Errores de JavaScript sin capturar: se registran y se avisa al usuario (no solo en la consola).
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    // authInterceptor el primero: así el loader y el manejo de errores ven ya la petición con `withCredentials`
    // y marcada con SENT_WITH_SESSION. refreshInterceptor el último (el más cerca de la red): las respuestas recorren
    // la lista al revés, así que un 401 lo ve él primero, renueva la sesión y reintenta; al errorInterceptor solo le
    // llega el resultado final (y si es un 401, es que ya no se podía renovar).
    provideHttpClient(withFetch(), withInterceptors([authInterceptor, loadingInterceptor, errorInterceptor, refreshInterceptor])),
    // La sesión guardada se recupera antes de la primera navegación: los guards deciden con ella ya cargada.
    {
      provide: APP_INITIALIZER,
      multi: true,
      useFactory: () => {
        const auth = inject(AuthStore);
        return () => auth.restore();
      },
    },
    { provide: APP_INITIALIZER, multi: true, useFactory: followSessionEndedElsewhere },
    provideAnimationsAsync(),
    { provide: LOCALE_ID, useValue: 'es-ES' },
  ],
};
