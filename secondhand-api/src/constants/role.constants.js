/**
 * Slugs de los roles. Los crea el seed y el código los usa para comprobar permisos (p. ej. que siempre
 * quede un admin): si se renombrara uno solo en el seed, el código dejaría de encontrarlo sin dar error.
 * No hay rol de vendedor: en Revishop cualquier usuario compra y vende.
 */
export const ROLE = Object.freeze({
  ADMIN: "admin",
  MODERATOR: "moderator",
  USER: "user",
});

export const PERMISSIONS = Object.freeze([
  "products:read",
  "products:write",
  "products:delete",
  "products:restore",
  "categories:manage",
  "users:manage",
  "roles:manage",
]);
