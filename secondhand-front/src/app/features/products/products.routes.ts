import { Routes } from '@angular/router';
import { APP_NAME } from '../../core/config/app.constants';

/** `products/new` va antes que `products/:slug`: un producto titulado "New" tendría slug `new` y nunca sería alcanzable. */
const PRODUCTS_ROUTES: Routes = [
  {
    path: '',
    title: `Catálogo · ${APP_NAME}`,
    loadComponent: () =>
      import('./pages/product-list-page/product-list-page.component').then((m) => m.ProductListPageComponent),
  },
  {
    path: 'products/new',
    title: `Publicar producto · ${APP_NAME}`,
    loadComponent: () =>
      import('./pages/product-create-page/product-create-page.component').then((m) => m.ProductCreatePageComponent),
  },
  {
    path: 'products/:slug',
    title: `Anuncio · ${APP_NAME}`,
    loadComponent: () =>
      import('./pages/product-detail-page/product-detail-page.component').then((m) => m.ProductDetailPageComponent),
  },
  {
    path: 'products/:slug/edit',
    title: `Editar anuncio · ${APP_NAME}`,
    loadComponent: () =>
      import('./pages/product-edit-page/product-edit-page.component').then((m) => m.ProductEditPageComponent),
  },
];

export default PRODUCTS_ROUTES;
