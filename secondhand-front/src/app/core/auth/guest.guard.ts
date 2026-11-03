import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { AuthStore } from './auth.store';

/** El login, solo sin sesión: quien ya ha entrado vuelve a la tienda (o al panel, si es admin). */
export const guestGuard: CanMatchFn = () => {
  const store = inject(AuthStore);
  if (!store.isAuthenticated()) return true;
  return inject(Router).createUrlTree([store.isAdmin() ? '/admin' : '/']);
};
