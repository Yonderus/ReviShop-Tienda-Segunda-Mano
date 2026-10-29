import { AUTH_MESSAGES } from "../constants/auth.constants.js";
import { ROLE } from "../constants/role.constants.js";
import { ForbiddenError, UnauthorizedError } from "../utils/AppError.js";
import { authenticate } from "./auth.middleware.js";

/**
 * Autorización por rol (pizarra ⑤, RBAC): ¿puedes hacer esto? Va siempre después de `authenticate`.
 * Sin sesión → 401; con sesión pero sin el rol → 403. Los roles, con `ROLE`, nunca con textos sueltos.
 *
 *   router.get("/trash", authenticate, requireAdmin, …)
 */
export const authorizeRoles =
  (...roles) =>
  (req, _res, next) => {
    if (!req.user) return next(new UnauthorizedError(AUTH_MESSAGES.TOKEN_MISSING));
    if (!roles.includes(req.user.role)) return next(new ForbiddenError(AUTH_MESSAGES.FORBIDDEN));
    next();
  };

/** Solo admin: el panel. */
export const requireAdmin = authorizeRoles(ROLE.ADMIN);

/** Autenticación + solo admin, para no repetir las dos en cada ruta del panel: `router.get("/trash", adminOnly, …)`. */
export const adminOnly = [authenticate, requireAdmin];
