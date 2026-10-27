import { changedFields } from '../../../shared/utils/diff';
import { User, UserInput } from './user.model';

/** "Lucía Martín" → "LM". */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/);
  return (words.length > 1 ? words[0][0] + words[words.length - 1][0] : name.slice(0, 2)).toUpperCase();
}

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
    status: user.status,
  };
}

/** Solo los campos que han cambiado (PATCH parcial). Una contraseña vacía no cuenta como cambio. */
export function diffUser(user: User, input: UserInput): Partial<UserInput> {
  return changedFields(userToInput(user), input);
}
