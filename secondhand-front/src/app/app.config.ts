import { registerLocaleData } from '@angular/common';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import localeEs from '@angular/common/locales/es';
import { APP_INITIALIZER, ApplicationConfig, LOCALE_ID, inject, provideZoneChangeDetection } from '@angular/core';
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
import { authInterceptor } from './core/auth/auth.interceptor';
import { AuthStore } from './core/auth/auth.store';
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
          transition.ready.catch(() => undefined);
          transition.finished.catch(() => undefined);
          transition.updateCallbackDone.catch(() => undefined);
        },
      }),
      withPreloading(PreloadAllModules),
      // anchorScrolling: los enlaces con #fragmento (p. ej. …/edit#variantes) bajan hasta esa sección.
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
    ),
    // authInterceptor el primero: así el loader y el manejo de errores ven ya la petición con su token.
    provideHttpClient(withFetch(), withInterceptors([authInterceptor, loadingInterceptor, errorInterceptor])),
    // La sesión guardada se recupera antes de la primera navegación: los guards deciden con ella ya cargada.
    {
      provide: APP_INITIALIZER,
      multi: true,
      useFactory: () => {
        const auth = inject(AuthStore);
        return () => auth.restore();
      },
    },
    provideAnimationsAsync(),
    { provide: LOCALE_ID, useValue: 'es-ES' },
  ],
};
