import { Injectable, computed, inject, signal } from '@angular/core';
import { ApiError } from '../models/api-error.model';
import { AuthChannel, AuthChannelMessage } from './auth-channel';
import { AuthUser, LoginInput, ROLE, RefreshOutcome, RoleSlug } from './auth.models';
import { AuthService } from './auth.service';

/** Donde la versión anterior guardaba el token. Se borra al arrancar para no dejarlo olvidado en el navegador. */
const LEGACY_TOKEN_KEY = 'revishop.token';

/** Se renueva antes de que caduque el access: 1 minuto antes, o una cuarta parte de su vida si es más corto. */
const RENEW_MARGIN_MS = 60_000;
/** `setTimeout` no admite más de ~24,8 días. */
const MAX_TIMEOUT_MS = 2_147_000_000;

function removeLegacyToken(): void {
  try {
    localStorage.removeItem(LEGACY_TOKEN_KEY);
  } catch {
    // Sin almacenamiento disponible (modo privado estricto): no hay nada que borrar.
  }
}

/**
 * La sesión, con signals. Hay dos tokens y los dos viven en cookies `httpOnly` que pone la API: el front **no los ve
 * ni los guarda**. El access (corto) va en cada petición; el refresh (largo) solo sirve para pedir otro access.
 * Lo único que sabe el front es quién es el usuario y cuándo caduca el access (`accessExpiresAt`).
 *
 * - `restore()` (al arrancar, antes de que los guards decidan): renueva la sesión; si no hay refresh, prueba `/me`.
 * - `refresh()`: renovación **single-flight**: si la piden varios a la vez (el interceptor con cinco 401, el
 *   temporizador…), se hace una sola petición y todos esperan su resultado.
 * - Renovación anticipada: un temporizador renueva poco antes de que caduque el access, con la pestaña visible.
 * - `logout()` revoca la sesión en la API; `clearSession()` solo la local (cuando la API ya ha dicho que no vale).
 * - Entre pestañas (AuthChannel): login, logout y renovaciones se avisan a las demás.
 * - Quien guarde datos ligados al usuario se apunta a `onSessionEnd` para vaciarlos al salir.
 */
@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly auth = inject(AuthService);
  private readonly channel = inject(AuthChannel);

  private readonly _user = signal<AuthUser | null>(null);
  private readonly _restoring = signal(true);
  private readonly sessionEndListeners = new Set<() => void>();
  private readonly endedElsewhereListeners = new Set<() => void>();
  private readonly userUpdatedListeners = new Set<(user: AuthUser) => void>();

  /** La renovación en curso (single-flight). */
  private refreshing: Promise<RefreshOutcome> | null = null;
  private renewTimer: ReturnType<typeof setTimeout> | null = null;
  /** Cuándo toca renovar (ms). 0 = nada programado. */
  private renewAt = 0;

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

  constructor() {
    this.channel.onMessage((message) => this.onOtherTab(message));
    // Al volver a una pestaña que estaba oculta, si ya tocaba renovar (el temporizador no lo hace en segundo plano).
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.renewAt && Date.now() >= this.renewAt && this.isAuthenticated()) {
        void this.refresh();
      }
    });
  }

  hasRole(role: string): boolean {
    return (this.roles() as string[]).includes(role);
  }

  /** La misma regla que la API (`utils/access.js`): lo suyo o, si es admin, cualquier cosa. */
  isOwnerOrAdmin(ownerId: string | null | undefined): boolean {
    const user = this._user();
    return !!user && (this.isAdmin() || (!!ownerId && ownerId === user._id));
  }

  /**
   * Recupera la sesión al arrancar. Primero renueva (así se sabe cuándo caduca el access y se puede renovar antes);
   * si no hay refresh (p. ej. una sesión de antes de los dos tokens) o lo acaba de renovar otra pestaña, `/me`.
   * Sin sesión, o sin red, se queda sin sesión y sin avisos.
   */
  async restore(): Promise<void> {
    removeLegacyToken();
    this._restoring.set(true);
    try {
      if ((await this.refresh()) !== 'ok') this._user.set(await this.auth.me());
    } catch {
      this._user.set(null);
    } finally {
      this._restoring.set(false);
    }
  }

  async login(input: LoginInput): Promise<AuthUser> {
    const { user, accessExpiresAt } = await this.auth.login(input);
    this._user.set(user);
    this.scheduleRenewal(accessExpiresAt);
    this.channel.post({ type: 'login' });
    return user;
  }

  /**
   * Renueva la sesión (single-flight). No cierra la sesión si falla: quien la pidió decide (el interceptor deja pasar
   * el 401 original y el errorInterceptor cierra la sesión y lleva al login, como siempre).
   */
  refresh(): Promise<RefreshOutcome> {
    this.refreshing ??= this.renew().finally(() => (this.refreshing = null));
    return this.refreshing;
  }

  /** Cierra la sesión: la API revoca los tokens y borra las cookies (aunque ya no valgan); aunque falle, se borra aquí. */
  async logout(): Promise<void> {
    await this.auth.logout().catch(() => undefined);
    this.clearSession();
  }

  /** En todos los dispositivos. Si la API falla, el error sube (la sesión sigue abierta y se puede reintentar). */
  async logoutAll(): Promise<void> {
    await this.auth.logoutAll();
    this.clearSession();
  }

  /**
   * Solo la sesión local, sin llamar a la API (los tokens ya no valen y la API ya ha borrado las cookies).
   * Avisa a las demás pestañas, salvo que el aviso venga precisamente de otra (`fromOtherTab`).
   */
  clearSession(fromOtherTab = false): void {
    this.cancelRenewal();
    const hadSession = this._user() !== null;
    this._user.set(null);
    if (!hadSession) return;
    this.sessionEndListeners.forEach((listener) => listener());
    if (fromOtherTab) this.endedElsewhereListeners.forEach((listener) => listener());
    else this.channel.post({ type: 'logout' });
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

  /** Se llama al terminar una sesión (logout, token que ya no vale o logout en otra pestaña). */
  onSessionEnd(listener: () => void): void {
    this.sessionEndListeners.add(listener);
  }

  /** Solo cuando la sesión se cerró en otra pestaña (para sacar de una página privada a esta). */
  onSessionEndedElsewhere(listener: () => void): void {
    this.endedElsewhereListeners.add(listener);
  }

  // ── Renovación ──

  private async renew(): Promise<RefreshOutcome> {
    try {
      const { user, accessExpiresAt } = await this.auth.refresh();
      this._user.set(user);
      this.scheduleRenewal(accessExpiresAt);
      this.channel.post({ type: 'refreshed', accessExpiresAt });
      return 'ok';
    } catch (error) {
      // 409: otra pestaña la ha renovado hace un instante; el navegador ya tiene las cookies nuevas.
      if (error instanceof ApiError && error.status === 409) return 'race';
      this.cancelRenewal();
      return 'failed';
    }
  }

  /** Programa la renovación anticipada: poco antes de que caduque el access. */
  private scheduleRenewal(accessExpiresAt: string): void {
    this.cancelRenewal();
    const expiresAt = new Date(accessExpiresAt).getTime();
    const remaining = expiresAt - Date.now();
    if (!Number.isFinite(remaining)) return;
    this.renewAt = expiresAt - Math.min(RENEW_MARGIN_MS, Math.max(remaining / 4, 0));
    const delay = Math.min(Math.max(this.renewAt - Date.now(), 0), MAX_TIMEOUT_MS);
    this.renewTimer = setTimeout(() => {
      this.renewTimer = null;
      // Con la pestaña oculta no se renueva (al volver lo hace el `visibilitychange`); sin sesión, tampoco.
      if (document.visibilityState === 'visible' && this.isAuthenticated()) void this.refresh();
    }, delay);
  }

  private cancelRenewal(): void {
    if (this.renewTimer) clearTimeout(this.renewTimer);
    this.renewTimer = null;
    this.renewAt = 0;
  }

  // ── Otras pestañas ──

  private onOtherTab(message: AuthChannelMessage): void {
    switch (message.type) {
      case 'logout':
        this.clearSession(true);
        break;
      case 'login':
        // Las cookies ya están en el navegador: basta con recuperar la sesión.
        if (!this.isAuthenticated()) void this.restore();
        break;
      case 'refreshed':
        // Otra pestaña ha renovado: esta solo reprograma (las cookies nuevas ya son de todas).
        if (this.isAuthenticated()) this.scheduleRenewal(message.accessExpiresAt);
        break;
    }
  }
}
