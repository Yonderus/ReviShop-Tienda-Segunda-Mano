import { Injectable } from '@angular/core';
import { EntityApiService } from '../../../core/services/entity-api.service';
import { User, UserInput } from '../models/user.model';

/** Todos los endpoints de usuarios son los comunes de EntityApiService. */
@Injectable({ providedIn: 'root' })
export class UsersService extends EntityApiService<User, UserInput> {
  protected readonly path = '/users';
}
