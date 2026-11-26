import { Routes } from '@angular/router';
import { adminGuard } from './core/auth/admin.guard';
import { APP_NAME } from './core/config/app.constants';
import AUTH_ROUTES from './features/auth/auth.routes';
import PROFILE_ROUTES from './features/profile/profile.routes';
import REVIEWS_ROUTES from './features/reviews/reviews.routes';
import SALES_ROUTES from './features/sales/sales.routes';
import SHOP_ROUTES from './features/shop/shop.routes';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';

/**
 * Las rutas de sesión, perfil y tienda van sueltas (sus páginas siguen siendo lazy con `loadComponent`): un
 * `{ path: '', loadChildren }` delante de otro se quedaría con la URL vacía aunque ninguno de sus hijos
 * coincida, y la portada saldría en blanco. El único grupo `''` lazy es el de productos.
 */
export const routes: Routes = [
  {
    path: 'admin',
    canMatch: [adminGuard],
    loadChildren: () => import('./features/admin/admin.routes'),
  },
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      ...SHOP_ROUTES,
      ...AUTH_ROUTES,
      ...PROFILE_ROUTES,
      ...SALES_ROUTES,
      ...REVIEWS_ROUTES,
      { path: '', loadChildren: () => import('./features/products/products.routes') },
      {
        path: '**',
        title: `Página no encontrada · ${APP_NAME}`,
        loadComponent: () =>
          import('./shared/components/page-not-found/page-not-found.component').then((m) => m.PageNotFoundComponent),
      },
    ],
  },
];
