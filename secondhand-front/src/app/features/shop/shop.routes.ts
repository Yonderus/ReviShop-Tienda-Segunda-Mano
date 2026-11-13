import { Routes } from '@angular/router';
import { APP_NAME } from '../../core/config/app.constants';

/** La tienda pública: el Home (portada), el shop (`/shop`, con los filtros en la URL) y su details. */
const SHOP_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: `${APP_NAME} · Segunda mano con segunda vida`,
    loadComponent: () => import('./pages/home-page/home-page.component').then((m) => m.HomePageComponent),
  },
  {
    path: 'shop',
    pathMatch: 'full',
    title: `Tienda · ${APP_NAME}`,
    loadComponent: () => import('./pages/shop-page/shop-page.component').then((m) => m.ShopPageComponent),
  },
  {
    path: 'shop/:slug',
    title: `Anuncio · ${APP_NAME}`,
    loadComponent: () => import('./pages/shop-detail-page/shop-detail-page.component').then((m) => m.ShopDetailPageComponent),
  },
];

export default SHOP_ROUTES;
