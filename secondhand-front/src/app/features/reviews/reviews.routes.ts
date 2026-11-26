import { Routes } from '@angular/router';
import { APP_NAME } from '../../core/config/app.constants';

/** El perfil público: lo puede ver cualquiera (con o sin sesión). El título lo pone la página con el nombre. */
const REVIEWS_ROUTES: Routes = [
  {
    path: 'sellers/:slug',
    title: `Perfil · ${APP_NAME}`,
    loadComponent: () => import('./pages/seller-profile-page/seller-profile-page.component').then((m) => m.SellerProfilePageComponent),
  },
];

export default REVIEWS_ROUTES;
