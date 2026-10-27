import { Routes } from '@angular/router';
import { APP_NAME } from '../../core/config/app.constants';
import { AdminLayoutComponent, AdminRouteMeta } from '../../layouts/admin-layout/admin-layout.component';

const title = (section: string) => `${section} · Admin · ${APP_NAME}`;
const meta = (data: AdminRouteMeta) => data;

const PRODUCTS_CRUMB = { label: 'Productos', link: '/admin/products' };
const CATEGORIES_CRUMB = { label: 'Categorías', link: '/admin/categories' };

/**
 * En cada sección, `<x>/new` va antes que `<x>/:slug/edit`, y `<x>/inactive` y `<x>/trash` no chocan con él
 * (distinta longitud).
 */
const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminLayoutComponent,
    children: [
      {
        path: '',
        title: title('Resumen'),
        data: meta({ crumbs: [{ label: 'Admin' }, { label: 'Resumen' }] }),
        loadComponent: () => import('./dashboard/admin-dashboard-page.component').then((m) => m.AdminDashboardPageComponent),
      },
      {
        path: 'products',
        title: title('Productos activos'),
        data: { ...meta({ crumbs: [{ label: 'Admin', link: '/admin' }, { label: 'Productos' }] }), view: 'active' },
        loadComponent: () => import('./products/admin-products-page.component').then((m) => m.AdminProductsPageComponent),
      },
      {
        path: 'products/inactive',
        title: title('Productos inactivos'),
        data: { ...meta({ crumbs: [{ label: 'Admin', link: '/admin' }, PRODUCTS_CRUMB, { label: 'Inactivos' }] }), view: 'inactive' },
        loadComponent: () => import('./products/admin-products-page.component').then((m) => m.AdminProductsPageComponent),
      },
      {
        path: 'products/new',
        title: title('Nuevo producto'),
        data: meta({ crumbs: [{ label: 'Admin', link: '/admin' }, PRODUCTS_CRUMB, { label: 'Nuevo' }] }),
        loadComponent: () => import('./products/admin-product-create-page.component').then((m) => m.AdminProductCreatePageComponent),
      },
      {
        path: 'products/:slug/edit',
        title: title('Editar producto'),
        data: meta({ crumbs: [{ label: 'Admin', link: '/admin' }, PRODUCTS_CRUMB, { label: 'Editar' }] }),
        loadComponent: () => import('./products/admin-product-edit-page.component').then((m) => m.AdminProductEditPageComponent),
      },
      {
        path: 'products/trash',
        title: title('Papelera de productos'),
        data: meta({ crumbs: [{ label: 'Admin', link: '/admin' }, PRODUCTS_CRUMB, { label: 'Papelera' }] }),
        loadComponent: () => import('./products/admin-trash-page.component').then((m) => m.AdminTrashPageComponent),
      },
      {
        path: 'categories',
        title: title('Categorías activas'),
        data: { ...meta({ crumbs: [{ label: 'Admin', link: '/admin' }, { label: 'Categorías' }] }), view: 'active' },
        loadComponent: () => import('./categories/admin-categories-page.component').then((m) => m.AdminCategoriesPageComponent),
      },
      {
        path: 'categories/inactive',
        title: title('Categorías inactivas'),
        data: { ...meta({ crumbs: [{ label: 'Admin', link: '/admin' }, CATEGORIES_CRUMB, { label: 'Inactivas' }] }), view: 'inactive' },
        loadComponent: () => import('./categories/admin-categories-page.component').then((m) => m.AdminCategoriesPageComponent),
      },
      {
        path: 'categories/new',
        title: title('Nueva categoría'),
        data: meta({ crumbs: [{ label: 'Admin', link: '/admin' }, CATEGORIES_CRUMB, { label: 'Nueva' }] }),
        loadComponent: () => import('./categories/admin-category-create-page.component').then((m) => m.AdminCategoryCreatePageComponent),
      },
      {
        path: 'categories/:slug/edit',
        title: title('Editar categoría'),
        data: meta({ crumbs: [{ label: 'Admin', link: '/admin' }, CATEGORIES_CRUMB, { label: 'Editar' }] }),
        loadComponent: () => import('./categories/admin-category-edit-page.component').then((m) => m.AdminCategoryEditPageComponent),
      },
      {
        path: 'categories/trash',
        title: title('Papelera de categorías'),
        data: meta({ crumbs: [{ label: 'Admin', link: '/admin' }, CATEGORIES_CRUMB, { label: 'Papelera' }] }),
        loadComponent: () => import('./categories/admin-categories-trash-page.component').then((m) => m.AdminCategoriesTrashPageComponent),
      },
      // La papelera era una sección suelta; ahora es una pestaña de Productos.
      { path: 'trash', redirectTo: 'products/trash', pathMatch: 'full' },
    ],
  },
];

export default ADMIN_ROUTES;
