import { Injectable, inject } from '@angular/core';
import { ApiService } from '../services/api.service';
import { AuthUser, LoginInput, LoginResponse } from './auth.models';

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

  /** Al arrancar la app: sin avisos ni loader (si el token ya no vale, simplemente no hay sesión). */
  me(): Promise<AuthUser> {
    return this.api.get<AuthUser>('/auth/me', { skipErrorAlert: true, skipGlobalLoader: true, skipAuthRedirect: true });
  }

  /** Revoca el token en el servidor (blacklist). Si falla, da igual: la sesión local se borra igualmente. */
  logout(): Promise<void> {
    return this.api.post<void>('/auth/logout', null, { skipErrorAlert: true, skipGlobalLoader: true, skipAuthRedirect: true });
  }
}
