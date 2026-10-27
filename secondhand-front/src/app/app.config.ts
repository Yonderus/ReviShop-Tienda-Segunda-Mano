import { registerLocaleData } from '@angular/common';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import localeEs from '@angular/common/locales/es';
import { ApplicationConfig, LOCALE_ID, provideZoneChangeDetection } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import {
  PreloadAllModules,
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
  withPreloading,
  withViewTransitions,
} from '@angular/router';
import { routes } from './app.routes';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { loadingInterceptor } from './core/interceptors/loading.interceptor';

registerLocaleData(localeEs, 'es-ES');

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
          transition.finished.catch(() => undefined);
          transition.updateCallbackDone.catch(() => undefined);
        },
      }),
      withPreloading(PreloadAllModules),
      // anchorScrolling: los enlaces con #fragmento (p. ej. …/edit#variantes) bajan hasta esa sección.
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
    ),
    // El futuro authInterceptor (cabecera Authorization) se añadirá al principio de esta lista.
    provideHttpClient(withFetch(), withInterceptors([loadingInterceptor, errorInterceptor])),
    provideAnimationsAsync(),
    { provide: LOCALE_ID, useValue: 'es-ES' },
  ],
};
