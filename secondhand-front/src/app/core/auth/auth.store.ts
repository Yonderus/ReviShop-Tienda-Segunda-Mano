import { Injectable, computed, inject, signal } from '@angular/core';
import { AUTH_TOKEN_KEY } from '../config/app.constants';
import { ApiError } from '../models/api-error.model';
import { AuthUser, LoginInput, ROLE, RoleSlug } from './auth.models';
import { AuthService } from './auth.service';

/** Segundos de margen: un token que caduca ahora mismo ya no se usa. */
const EXPIRY_MARGIN_S = 10;

/** `exp` del JWT (segundos) leído sin librerías: es la parte central, en base64url. null si no se puede leer. */
function tokenExpiry(token: string): number | null {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const { exp } = JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, '=')));
    return typeof exp === 'number' ? exp : null;
  } catch {
    return null;
  }
}

const isExpired = (token: string): boolean => {
  const exp = tokenExpiry(token);
  return exp === null || exp - EXPIRY_MARGIN_S <= Date.now() / 1000;
};

// localStorage puede no estar disponible (modo privado estricto, almacenamiento bloqueado): sin él, no hay sesión.
const storage = {
  read: (): string | null => {
    try {
      return localStorage.getItem(AUTH_TOKEN_KEY);
    } catch {
      return null;
    }
  },
  write: (token: string | null): void => {
    try {
      if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
      else localStorage.removeItem(AUTH_TOKEN_KEY);
    } catch {
      // Sin almacenamiento: la sesión dura lo que la pestaña.
    }
  },
};

/**
 * La sesión, con signals (pizarra ②⑥). Guarda **solo el token** en localStorage; el usuario sale siempre de
 * la API (`/auth/me`), así un cambio de rol o una desactivación se notan al recargar.
 *
 * - `restore()` se llama al arrancar la app (APP_INITIALIZER), antes de que los guards decidan.
 * - `logout()` revoca el token en la API y borra la sesión local; `clearSession()` solo la local (para cuando
 *   la API ya ha dicho que el token no vale).
 * - Quien guarde datos ligados al usuario se apunta a `onSessionEnd` para vaciarlos al salir.
 */
@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly auth = inject(AuthService);

  private readonly _token = signal<string | null>(null);
  private readonly _user = signal<AuthUser | null>(null);
  private readonly _restoring = signal(false);
  private readonly sessionEndListeners = new Set<() => void>();

  readonly token = this._token.asReadonly();
  readonly user = this._user.asReadonly();
  /** true mientras se comprueba la sesión guardada al arrancar (para no parpadear entre "Iniciar sesión" y el usuario). */
  readonly restoring = this._restoring.asReadonly();

  readonly isAuthenticated = computed(() => this._token() !== null && this._user() !== null);
  readonly role = computed<RoleSlug | null>(() => this._user()?.role?.slug ?? null);
  /** Un usuario tiene un rol; la lista es para cumplir con `hasRole` sin inventar nada. */
  readonly roles = computed<RoleSlug[]>(() => {
    const role = this.role();
    return role ? [role] : [];
  });
  readonly isAdmin = computed(() => this.role() === ROLE.ADMIN);

  hasRole(role: string): boolean {
    return (this.roles() as string[]).includes(role);
  }

  /** Recupera la sesión guardada: si el token no ha caducado, pide el usuario a la API. */
  async restore(): Promise<void> {
    const token = storage.read();
    if (!token || isExpired(token)) {
      this.clearSession();
      return;
    }
    this._token.set(token);
    this._restoring.set(true);
    try {
      this._user.set(await this.auth.me());
    } catch (error) {
      // 401: el token ya no vale (logout, caducado, cuenta desactivada…). Otro error (sin red): la sesión se
      // queda guardada, pero sin usuario; al recargar con la API disponible se recupera.
      if (error instanceof ApiError && error.status === 401) this.clearSession();
      else this._user.set(null);
    } finally {
      this._restoring.set(false);
    }
  }

  async login(input: LoginInput): Promise<AuthUser> {
    const { token, user } = await this.auth.login(input);
    storage.write(token);
    this._token.set(token);
    this._user.set(user);
    return user;
  }

  /** Cierra la sesión: la revoca en la API (blacklist) y, aunque eso falle, la borra aquí. */
  async logout(): Promise<void> {
    if (this._token()) await this.auth.logout().catch(() => undefined);
    this.clearSession();
  }

  /** Solo la sesión local, sin llamar a la API (el token ya no vale). */
  clearSession(): void {
    const hadSession = this._token() !== null || this._user() !== null;
    storage.write(null);
    this._token.set(null);
    this._user.set(null);
    if (hadSession) this.sessionEndListeners.forEach((listener) => listener());
  }

  /** Para el perfil: el usuario actualizado sin pedirlo otra vez (p. ej. al cambiar la foto). */
  updateUser(changes: Partial<AuthUser>): void {
    this._user.update((user) => (user ? { ...user, ...changes } : user));
  }

  /** Se llama al terminar una sesión (logout o token que ya no vale). */
  onSessionEnd(listener: () => void): void {
    this.sessionEndListeners.add(listener);
  }
}
