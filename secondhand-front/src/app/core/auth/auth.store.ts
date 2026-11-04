import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthUser, LoginInput, ROLE, RoleSlug } from './auth.models';
import { AuthService } from './auth.service';

/** Donde la versión anterior guardaba el token. Se borra al arrancar para no dejarlo olvidado en el navegador. */
const LEGACY_TOKEN_KEY = 'revishop.token';

function removeLegacyToken(): void {
  try {
    localStorage.removeItem(LEGACY_TOKEN_KEY);
  } catch {
    // Sin almacenamiento disponible (modo privado estricto): no hay nada que borrar.
  }
}

/**
 * La sesión, con signals (pizarra ②⑥). El token vive en una cookie `httpOnly` que pone la API: el front **no
 * lo ve ni lo guarda**. Lo único que sabe es quién es el usuario, y eso sale siempre de la API (`/auth/me`),
 * así un cambio de rol o una desactivación se notan al recargar.
 *
 * - `restore()` se llama al arrancar la app (APP_INITIALIZER), antes de que los guards decidan.
 * - `logout()` revoca el token y borra la cookie en la API, y después la sesión local; `clearSession()` solo
 *   la local (para cuando la API ya ha dicho que el token no vale; la cookie ya la ha borrado ella).
 * - Quien guarde datos ligados al usuario se apunta a `onSessionEnd` para vaciarlos al salir.
 */
@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly auth = inject(AuthService);

  private readonly _user = signal<AuthUser | null>(null);
  private readonly _restoring = signal(true);
  private readonly sessionEndListeners = new Set<() => void>();
  private readonly userUpdatedListeners = new Set<(user: AuthUser) => void>();

  readonly user = this._user.asReadonly();
  /** true mientras se comprueba la sesión al arrancar (para no parpadear entre "Iniciar sesión" y el usuario). */
  readonly restoring = this._restoring.asReadonly();

  readonly isAuthenticated = computed(() => this._user() !== null);
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

  /** La misma regla que la API (`utils/access.js`): lo suyo o, si es admin, cualquier cosa. */
  isOwnerOrAdmin(ownerId: string | null | undefined): boolean {
    const user = this._user();
    return !!user && (this.isAdmin() || (!!ownerId && ownerId === user._id));
  }

  /**
   * Recupera la sesión: como la cookie no se puede leer, siempre pregunta a la API. 200 → hay sesión;
   * 401 (sin cookie, caducada, revocada…) o cualquier otro fallo (sin red) → no hay sesión, sin avisos.
   */
  async restore(): Promise<void> {
    removeLegacyToken();
    this._restoring.set(true);
    try {
      this._user.set(await this.auth.me());
    } catch {
      this._user.set(null);
    } finally {
      this._restoring.set(false);
    }
  }

  async login(input: LoginInput): Promise<AuthUser> {
    const { user } = await this.auth.login(input);
    this._user.set(user);
    return user;
  }

  /** Cierra la sesión: la API revoca el token y borra la cookie (aunque ya no valga); aunque falle, se borra aquí. */
  async logout(): Promise<void> {
    await this.auth.logout().catch(() => undefined);
    this.clearSession();
  }

  /** Solo la sesión local, sin llamar a la API (el token ya no vale y la API ya ha borrado la cookie). */
  clearSession(): void {
    const hadSession = this._user() !== null;
    this._user.set(null);
    if (hadSession) this.sessionEndListeners.forEach((listener) => listener());
  }

  /**
   * El usuario de la sesión actualizado sin pedirlo otra vez (p. ej. al cambiar la foto en Mi perfil o al
   * editarse a sí mismo en el panel). Avisa a quien guarde una copia (`onUserUpdated`), para que la foto y el
   * nombre cambien en todas partes sin recargar.
   */
  updateUser(changes: Partial<AuthUser>): void {
    this._user.update((user) => (user ? { ...user, ...changes } : user));
    const user = this._user();
    if (user) this.userUpdatedListeners.forEach((listener) => listener(user));
  }

  /** Para quien guarde una copia del usuario de la sesión (p. ej. la lista de usuarios del panel). */
  onUserUpdated(listener: (user: AuthUser) => void): void {
    this.userUpdatedListeners.add(listener);
  }

  /** Se llama al terminar una sesión (logout o token que ya no vale). */
  onSessionEnd(listener: () => void): void {
    this.sessionEndListeners.add(listener);
  }
}
