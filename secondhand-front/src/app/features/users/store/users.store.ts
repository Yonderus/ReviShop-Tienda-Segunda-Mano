import { Injectable, inject, signal } from '@angular/core';
import { ApiError, toApiError } from '../../../core/models/api-error.model';
import { EntityStore } from '../../../core/store/entity.store';
import { CatalogStore } from '../../catalog/store/catalog.store';
import { Role } from '../models/role.model';
import { User, UserInput } from '../models/user.model';
import { RolesService } from '../services/roles.service';
import { UsersService } from '../services/users.service';

/** Panel de usuarios. Carga, escrituras, visibilidad optimista y papelera vienen de EntityStore. */
@Injectable({ providedIn: 'root' })
export class UsersStore extends EntityStore<User, UserInput> {
  protected readonly api = inject(UsersService);
  private readonly rolesService = inject(RolesService);
  private readonly catalog = inject(CatalogStore);

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
