import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { toLogin } from './auth.guard';
import { AuthStore } from './auth.store';

/**
 * El panel, solo para admin. Sin sesión, al login (y de vuelta al panel al entrar); con sesión pero sin
 * permiso, a "Acceso denegado". `canMatch`: el código del panel ni siquiera se descarga si no puede entrar.
 */
export const adminGuard: CanMatchFn = () => {
  const store = inject(AuthStore);
  const router = inject(Router);
  if (!store.isAuthenticated()) return toLogin(router);
  return store.isAdmin() || router.createUrlTree(['/forbidden']);
};
