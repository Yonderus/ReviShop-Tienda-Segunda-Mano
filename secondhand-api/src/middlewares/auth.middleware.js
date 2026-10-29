import { AUTH_MESSAGES } from "../constants/auth.constants.js";
import { authService } from "../services/auth.service.js";
import { UnauthorizedError } from "../utils/AppError.js";

/**
 * Autenticación (pizarra ④): ¿quién eres? Lee `Authorization: Bearer <token>` y le pide a `authService` que lo
 * compruebe (firma, caducidad, blacklist, cierre de sesiones y que el usuario y su rol sigan activos).
 * Deja `req.user = { id, email, name, role }` y `req.auth = { jti, exp }`. Si algo falla, 401.
 */
export const authenticate = async (req, _res, next) => {
  try {
    const [scheme, token] = (req.get("Authorization") ?? "").split(" ");
    if (scheme !== "Bearer" || !token) throw new UnauthorizedError(AUTH_MESSAGES.TOKEN_MISSING);
    const { user, auth } = await authService.authenticate(token);
    req.user = user;
    req.auth = auth;
    next();
  } catch (error) {
    next(error);
  }
};
