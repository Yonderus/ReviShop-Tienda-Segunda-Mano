import { ROLE } from "../constants/role.constants.js";

/*
 * Reglas de acceso puras (sin base de datos). `user` es el de la sesión: `req.user = { id, email, name, role }`.
 * Las comprobaciones que necesitan cargar el recurso (¿de quién es este producto?) las hace el service con
 * estas funciones.
 */

export const isAdmin = (user) => user?.role === ROLE.ADMIN;

/** ABAC: el dueño del recurso o un admin. `ownerId` es el id del dueño (p. ej. el `sellerId` de un producto). */
export const isOwnerOrAdmin = (user, ownerId) => isAdmin(user) || (Boolean(user) && String(ownerId) === String(user.id));
