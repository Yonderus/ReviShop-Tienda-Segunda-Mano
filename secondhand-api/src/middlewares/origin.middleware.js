import { env } from "../config/env.js";
import { AUTH_MESSAGES } from "../constants/auth.constants.js";
import { ForbiddenError } from "../utils/AppError.js";

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Segunda defensa contra CSRF (la primera es `SameSite=Strict` en la cookie). Una escritura que llega desde un
 * navegador trae la cabecera `Origin`: solo se acepta si es el front (`CORS_ORIGIN`) o la propia API (Swagger).
 * Sin `Origin` no es un navegador (curl, Postman, scripts), así que no hay CSRF posible y pasa.
 */
export const checkOrigin = (req, _res, next) => {
  const origin = req.get("Origin");
  if (!WRITE_METHODS.has(req.method) || !origin) return next();

  const ownOrigin = `${req.protocol}://${req.get("host")}`;
  if (origin === ownOrigin || env.corsOrigins.includes(origin)) return next();
  next(new ForbiddenError(AUTH_MESSAGES.ORIGIN_NOT_ALLOWED));
};
