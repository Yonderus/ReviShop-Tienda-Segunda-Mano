import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { AuthStore } from './auth.store';

/**
 * Pizarra ③: añade `Authorization: Bearer <token>` a las peticiones a **nuestra** API (también a las públicas:
 * así el dueño puede abrir su anuncio inactivo). Nunca a otros dominios, para no regalar el token.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthStore).token();
  if (!token || !req.url.startsWith(environment.apiUrl) || req.headers.has('Authorization')) return next(req);
  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
