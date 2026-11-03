import { Routes } from '@angular/router';
import { guestGuard } from '../../core/auth/guest.guard';
import { APP_NAME } from '../../core/config/app.constants';

/** Páginas de la sesión, dentro del layout de la tienda. */
const AUTH_ROUTES: Routes = [
  {
    path: 'login',
    canMatch: [guestGuard],
    title: `Iniciar sesión · ${APP_NAME}`,
    loadComponent: () => import('./pages/login-page/login-page.component').then((m) => m.LoginPageComponent),
  },
  {
    path: 'forbidden',
    title: `Acceso denegado · ${APP_NAME}`,
    loadComponent: () => import('./pages/forbidden-page/forbidden-page.component').then((m) => m.ForbiddenPageComponent),
  },
];

export default AUTH_ROUTES;
