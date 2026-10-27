import { EntityRecord } from '../../../core/models/entity.model';
import { BadgeTone } from '../../../shared/ui/badge.component';
import { RoleSummary } from './role.model';

export const USER_STATUSES = ['pending', 'verified', 'suspended'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  pending: 'Pendiente',
  verified: 'Verificado',
  suspended: 'Suspendido',
};

export const USER_STATUS_TONES: Record<UserStatus, BadgeTone> = {
  pending: 'warning',
  verified: 'success',
  suspended: 'neutral',
};

/** Los mismos límites que la API (bcrypt ignora más allá de 72 bytes). */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;

/** Usuario del panel. La API nunca devuelve la contraseña. */
export interface User extends EntityRecord {
  name: string;
  email: string;
  roleId: string;
  role: RoleSummary | null;
  phone?: string;
  location?: string;
  bio?: string;
  status: UserStatus;
  lastLoginAt: string | null;
  emailVerifiedAt: string | null;
  productsCount: number;
}

/** `password` vacío al editar = no cambiarla (no se envía). */
export interface UserInput {
  name: string;
  email: string;
  password: string;
  roleId: string;
  phone: string;
  location: string;
  bio: string;
  status: UserStatus;
}
