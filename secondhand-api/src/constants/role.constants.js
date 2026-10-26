/**
 * Slugs de los roles. Los crea el seed y el código depende de ellos (p. ej. qué roles pueden vender):
 * si se renombrara uno solo en el seed, el código dejaría de encontrarlo sin dar ningún error.
 */
export const ROLE = Object.freeze({
  ADMIN: "admin",
  MODERATOR: "moderator",
  SELLER: "seller",
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
