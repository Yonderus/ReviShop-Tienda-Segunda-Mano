import { AUTH_MESSAGES } from "../constants/auth.constants.js";
import { authService } from "../services/auth.service.js";
import { UnauthorizedError } from "../utils/AppError.js";

/** El token de `Authorization: Bearer <token>`, o null si no hay (o no es Bearer). */
function bearerToken(req) {
  const [scheme, token] = (req.get("Authorization") ?? "").split(" ");
  return scheme === "Bearer" && token ? token : null;
}

/**
 * Autenticación (pizarra ④): ¿quién eres? Lee `Authorization: Bearer <token>` y le pide a `authService` que lo
 * compruebe (firma, caducidad, blacklist, cierre de sesiones y que el usuario y su rol sigan activos).
 * Deja `req.user = { id, email, name, role }` y `req.auth = { jti, exp }`. Si algo falla, 401.
 */
export const authenticate = async (req, _res, next) => {
  try {
    const token = bearerToken(req);
    if (!token) throw new UnauthorizedError(AUTH_MESSAGES.TOKEN_MISSING);
    const { user, auth } = await authService.authenticate(token);
    req.user = user;
    req.auth = auth;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Sesión opcional, para rutas públicas que enseñan algo más a quien tiene permiso (p. ej. un producto
 * inactivo, solo a su dueño o a un admin). Con un token válido deja `req.user`; sin token, o con uno
 * caducado o no válido, sigue como público (sin 401): una sesión caducada en el navegador no rompe la tienda.
 */
export const optionalAuthenticate = async (req, _res, next) => {
  const token = bearerToken(req);
  if (token) {
    try {
      const { user, auth } = await authService.authenticate(token);
      req.user = user;
      req.auth = auth;
    } catch {
      // Público: como si no hubiera token.
    }
  }
  next();
};
