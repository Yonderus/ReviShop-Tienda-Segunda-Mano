import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { SENT_WITH_SESSION } from '../config/api.tokens';
import { AuthStore } from './auth.store';

/**
 * Pizarra ③, con cookie: el token va en la cookie `httpOnly` de la API y el navegador la envía solo, pero en
 * peticiones a otro origen (en desarrollo, `localhost:4200` → `localhost:3000`) únicamente con
 * `withCredentials`. Se pone **solo** hacia nuestra API (también en las públicas: así el dueño puede abrir su
 * anuncio inactivo), nunca hacia otros dominios. Además marca si la petición sale con la sesión abierta
 * (`SENT_WITH_SESSION`), para que el errorInterceptor sepa qué significa un 401.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiUrl)) return next(req);
  const withSession = inject(AuthStore).isAuthenticated();
  return next(req.clone({ withCredentials: true, context: req.context.set(SENT_WITH_SESSION, withSession) }));
};
