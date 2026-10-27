import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { READ_OPTIONS } from '../../../core/services/entity-api.service';
import { Role } from '../models/role.model';

@Injectable({ providedIn: 'root' })
export class RolesService {
  private readonly api = inject(ApiService);

  list(): Promise<Role[]> {
    return this.api.get<Role[]>('/roles', READ_OPTIONS);
  }
}
