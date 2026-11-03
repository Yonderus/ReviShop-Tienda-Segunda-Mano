import { changedFields } from '../../../shared/utils/diff';
import { User, UserInput } from './user.model';

/** Lo que el formulario necesita para editar un usuario cargado. La contraseña nunca se precarga. */
export function userToInput(user: User): UserInput {
  return {
    name: user.name,
    email: user.email,
    password: '',
    roleId: user.roleId,
    phone: user.phone ?? '',
    location: user.location ?? '',
    bio: user.bio ?? '',
    avatarUrl: user.avatarUrl ?? null,
    status: user.status,
  };
}

/** Solo los campos que han cambiado (PATCH parcial). Una contraseña vacía no cuenta como cambio. */
export function diffUser(user: User, input: UserInput): Partial<UserInput> {
  return changedFields(userToInput(user), input);
}
