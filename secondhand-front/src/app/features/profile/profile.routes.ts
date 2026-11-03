import { Routes } from '@angular/router';
import { authGuard } from '../../core/auth/auth.guard';
import { APP_NAME } from '../../core/config/app.constants';

const PROFILE_ROUTES: Routes = [
  {
    path: 'profile',
    canMatch: [authGuard],
    title: `Mi perfil · ${APP_NAME}`,
    loadComponent: () => import('./pages/profile-page/profile-page.component').then((m) => m.ProfilePageComponent),
  },
];

export default PROFILE_ROUTES;
