/** Slugs de los roles de la API. El panel es solo para `admin`; el moderador funciona como un usuario. */
export const ROLE = {
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  USER: 'user',
} as const;
export type RoleSlug = (typeof ROLE)[keyof typeof ROLE];

/** El usuario de la sesión, tal como lo devuelven `POST /auth/login` y `GET /auth/me`. Nunca la contraseña. */
export interface AuthUser {
  _id: string;
  name: string;
  slug: string;
  email: string;
  status: string;
  role: { name: string; slug: RoleSlug } | null;
  /** No viene si no tiene foto. */
  avatarUrl?: string;
  profile: { phone?: string; location?: string; bio?: string };
}

export interface LoginInput {
  email: string;
  password: string;
}

/** El token no viene: la API lo guarda en la cookie `httpOnly` (JavaScript nunca lo ve). */
export interface LoginResponse {
  user: AuthUser;
}
