import { Routes } from '@angular/router';
import { adminGuard } from './core/auth/admin.guard';
import { APP_NAME } from './core/config/app.constants';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';

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
