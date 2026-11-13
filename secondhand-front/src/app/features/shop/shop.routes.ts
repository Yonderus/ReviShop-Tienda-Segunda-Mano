import { Routes } from '@angular/router';
import { APP_NAME } from '../../core/config/app.constants';

/** La tienda pública: el Home (portada). El shop (`/shop`) y su details (`/shop/:slug`) se añaden aquí también. */
const SHOP_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: `${APP_NAME} · Segunda mano con segunda vida`,
    loadComponent: () => import('./pages/home-page/home-page.component').then((m) => m.HomePageComponent),
  },
];

export default SHOP_ROUTES;
