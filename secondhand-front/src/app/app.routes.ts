import { Routes } from '@angular/router';
import { adminGuard } from './core/auth/admin.guard';
import { APP_NAME } from './core/config/app.constants';
import AUTH_ROUTES from './features/auth/auth.routes';
import PROFILE_ROUTES from './features/profile/profile.routes';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';

/**
 * Las rutas de sesión y de perfil van sueltas (sus páginas siguen siendo lazy con `loadComponent`): un
 * `{ path: '', loadChildren }` delante del catálogo se quedaría con la URL vacía aunque ninguno de sus hijos
 * coincida, y la portada saldría en blanco. El único grupo `''` lazy es el del catálogo.
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
      ...AUTH_ROUTES,
      ...PROFILE_ROUTES,
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
