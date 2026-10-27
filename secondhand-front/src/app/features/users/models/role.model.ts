import { BadgeTone } from '../../../shared/ui/badge.component';

/** Respuesta de GET /roles: los que se pueden asignar. */
export interface Role {
  _id: string;
  name: string;
  slug: string;
  description?: string;
}

/** Lo que llega poblado dentro de un usuario. */
export type RoleSummary = Pick<Role, '_id' | 'name' | 'slug'>;

/** Tono del badge por slug de rol. Un rol nuevo sale en neutro hasta que se le asigne uno. */
export const ROLE_TONES: Partial<Record<string, BadgeTone>> = {
  admin: 'info',
  moderator: 'warning',
};
