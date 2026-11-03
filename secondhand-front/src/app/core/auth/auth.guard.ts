import { inject } from '@angular/core';
import { CanMatchFn, Router, UrlTree } from '@angular/router';
import { AuthStore } from './auth.store';

/** Al login, recordando adónde se quería ir para volver después de entrar. */
export function toLogin(router: Router): UrlTree {
  const returnUrl = router.getCurrentNavigation()?.extractedUrl.toString();
  return router.createUrlTree(['/login'], { queryParams: returnUrl && returnUrl !== '/' ? { returnUrl } : {} });
}

/** Solo con sesión (publicar, editar, mi perfil). Sin sesión, al login. */
export const authGuard: CanMatchFn = () => {
  const router = inject(Router);
  return inject(AuthStore).isAuthenticated() || toLogin(router);
};
