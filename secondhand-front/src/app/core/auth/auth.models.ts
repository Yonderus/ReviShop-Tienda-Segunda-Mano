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

/**
 * Respuesta del login y del refresh. Los tokens no vienen: la API los pone en cookies `httpOnly` (JavaScript nunca
 * los ve). `accessExpiresAt` (ISO) es cuándo caduca el access token: con eso se renueva un poco antes.
 */
export interface LoginResponse {
  user: AuthUser;
  accessExpiresAt: string;
}

/** `POST /auth/refresh` devuelve lo mismo que el login. */
export type RefreshResponse = LoginResponse;

/**
 * Cómo acabó una renovación:
 * - `ok`: hay sesión nueva;
 * - `race`: otra pestaña la acaba de renovar (409): las cookies nuevas ya están en el navegador;
 * - `failed`: no se puede renovar (refresh caducado, revocado, sin red…).
 */
export type RefreshOutcome = 'ok' | 'race' | 'failed';
