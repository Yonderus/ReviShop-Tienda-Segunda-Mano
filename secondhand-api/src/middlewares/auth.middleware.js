import { AUTH_MESSAGES } from "../constants/auth.constants.js";
import { authService } from "../services/auth.service.js";
import { UnauthorizedError } from "../utils/AppError.js";
import { clearSessionCookie, sessionToken } from "../utils/sessionCookie.js";

/**
 * Autenticación (pizarra ④): ¿quién eres? Lee el token de la cookie de sesión (`revishop_session`) y le pide
 * a `authService` que lo compruebe (firma, caducidad, blacklist, cierre de sesiones y que el usuario y su rol
 * sigan activos). Deja `req.user = { id, email, name, role }` y `req.auth = { jti, exp }`. Si algo falla, 401;
 * y si la cookie traía un token que ya no vale, se borra en esa misma respuesta.
 */
export const authenticate = async (req, res, next) => {
  try {
    const token = sessionToken(req);
    if (!token) throw new UnauthorizedError(AUTH_MESSAGES.TOKEN_MISSING);
    try {
      const { user, auth } = await authService.authenticate(token);
      req.user = user;
      req.auth = auth;
    } catch (error) {
      clearSessionCookie(res);
      throw error;
    }
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Sesión opcional, para rutas públicas que enseñan algo más a quien tiene permiso (p. ej. un producto
 * inactivo, solo a su dueño o a un admin). Con un token válido deja `req.user`; sin cookie, o con un token
 * caducado o no válido, sigue como público (sin 401) y borra la cookie inútil: una sesión caducada en el
 * navegador no rompe la tienda.
 */
export const optionalAuthenticate = async (req, res, next) => {
  const token = sessionToken(req);
  if (token) {
    try {
      const { user, auth } = await authService.authenticate(token);
      req.user = user;
      req.auth = auth;
    } catch {
      // Público: como si no hubiera sesión.
      clearSessionCookie(res);
    }
  }
  next();
};
