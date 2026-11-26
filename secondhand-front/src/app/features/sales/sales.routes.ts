import { Routes } from '@angular/router';
import { authGuard } from '../../core/auth/auth.guard';
import { APP_NAME } from '../../core/config/app.constants';

const SALES_ROUTES: Routes = [
  {
    path: 'activity',
    canMatch: [authGuard],
    title: `Mi actividad · ${APP_NAME}`,
    loadComponent: () => import('./pages/activity-page/activity-page.component').then((m) => m.ActivityPageComponent),
  },
];

export default SALES_ROUTES;
