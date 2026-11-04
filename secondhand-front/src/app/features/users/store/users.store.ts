import { Injectable, inject, signal } from '@angular/core';
import { AuthStore } from '../../../core/auth/auth.store';
import { ApiError, toApiError } from '../../../core/models/api-error.model';
import { EntityStore } from '../../../core/store/entity.store';
import { CatalogStore } from '../../catalog/store/catalog.store';
import { Role } from '../models/role.model';
import { User, UserInput } from '../models/user.model';
import { RolesService } from '../services/roles.service';
import { UsersService } from '../services/users.service';

/**
 * Panel de usuarios. Carga, escrituras, visibilidad optimista y papelera vienen de EntityStore.
 *
 * El usuario de la sesión vive en dos sitios: el AuthStore (menú de arriba) y, si es admin, esta lista. Se
 * mantienen iguales en los dos sentidos, sin recargar: Mi perfil → su fila del panel (`onUserUpdated`) y
 * editarse a sí mismo en el panel → el menú (`update`).
 */
@Injectable({ providedIn: 'root' })
export class UsersStore extends EntityStore<User, UserInput> {
  protected readonly api = inject(UsersService);
  private readonly rolesService = inject(RolesService);
  private readonly catalog = inject(CatalogStore);
  private readonly auth = inject(AuthStore);

  constructor() {
    super();
    // Mi perfil (o cualquier cambio del usuario de la sesión) → su fila del panel, si ya está cargada.
    this.auth.onUserUpdated((user) =>
      this.patchCached(user._id, {
        name: user.name,
        slug: user.slug,
        email: user.email,
        avatarUrl: user.avatarUrl,
        phone: user.profile.phone,
        location: user.profile.location,
        bio: user.profile.bio,
      }),
    );
  }

  /** Si el admin se edita a sí mismo, el menú de arriba (foto, nombre, email) cambia al momento. */
  override async update(user: User, changes: Partial<UserInput>): Promise<User> {
    const updated = await super.update(user, changes);
    if (updated._id === this.auth.user()?._id) {
      this.auth.updateUser({
        name: updated.name,
        slug: updated.slug,
        email: updated.email,
        avatarUrl: updated.avatarUrl,
        profile: { phone: updated.phone, location: updated.location, bio: updated.bio },
      });
    }
    return updated;
  }

  // Roles para el select del formulario: se piden una vez.
  private readonly _roles = signal<Role[]>([]);
  private readonly _rolesError = signal<ApiError | null>(null);
  private rolesRequest: Promise<void> | null = null;
  readonly roles = this._roles.asReadonly();
  readonly rolesError = this._rolesError.asReadonly();

  loadRoles(options: { force?: boolean } = {}): Promise<void> {
    if (!this.rolesRequest || options.force) {
      this._rolesError.set(null);
      this.rolesRequest = this.rolesService
        .list()
        .then((roles) => this._roles.set(roles))
        .catch((raw) => {
          this._rolesError.set(toApiError(raw));
          this.rolesRequest = null;
        });
    }
    return this.rolesRequest;
  }

  /** Quién puede vender cambia con cualquier escritura: el select "Vendedor" de los productos se recarga. */
  protected override afterWrite(): void {
    void this.catalog.load({ force: true });
  }
}
