import { Injectable, inject } from '@angular/core';
import { ApiService } from '../services/api.service';
import { AuthUser, LoginInput, LoginResponse, RefreshResponse } from './auth.models';

/** Lo que pinta el formulario de login (credenciales, cuenta bloqueada, demasiados intentos, datos no válidos). */
export const LOGIN_INLINE_STATUSES: readonly number[] = [401, 403, 422, 429];

/**
 * Solo las llamadas HTTP de la sesión. Sin estado, sin UI y sin navegación: eso es del AuthStore y de las
 * páginas. Ninguna de estas peticiones convierte un 401 en "tu sesión ha caducado" (SKIP_AUTH_REDIRECT).
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);

  login(input: LoginInput): Promise<LoginResponse> {
    return this.api.post<LoginResponse>('/auth/login', input, {
      inlineErrorStatuses: LOGIN_INLINE_STATUSES,
      blocking: true,
      skipAuthRedirect: true,
    });
  }

  /** Al arrancar la app: sin avisos ni loader (sin cookie, o con una que ya no vale, simplemente no hay sesión). */
  me(): Promise<AuthUser> {
    return this.api.get<AuthUser>('/auth/me', { skipErrorAlert: true, skipGlobalLoader: true, skipAuthRedirect: true });
  }

  /**
   * Renueva la sesión: el navegador manda la cookie del refresh (solo viaja a /api/auth) y la API pone las dos cookies
   * nuevas. Sin avisos ni loader: pasa sin que el usuario lo note. Errores: 401 (no se puede renovar) o 409 (otra
   * pestaña acaba de hacerlo).
   */
  refresh(): Promise<RefreshResponse> {
    return this.api.post<RefreshResponse>('/auth/refresh', null, { skipErrorAlert: true, skipGlobalLoader: true, skipAuthRedirect: true });
  }

  /**
   * Revoca la sesión en el servidor (el access a la blacklist y la sesión de refresh entera) y borra las dos cookies,
   * que desde JavaScript no se pueden tocar. Es idempotente; si falla (sin red), da igual: la sesión local se borra.
   */
  logout(): Promise<void> {
    return this.api.post<void>('/auth/logout', null, { skipErrorAlert: true, skipGlobalLoader: true, skipAuthRedirect: true });
  }

  /** Cierra la sesión en todos los dispositivos (todas las sesiones de refresh y los access de los demás). */
  logoutAll(): Promise<void> {
    return this.api.post<void>('/auth/logout-all', null, { blocking: true, skipAuthRedirect: true });
  }
}
