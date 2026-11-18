import { env } from "../config/env.js";
import { AI_MESSAGES } from "../constants/ai.constants.js";
import { ForbiddenError } from "../utils/AppError.js";

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * La misma defensa contra CSRF que la API (la primera es `SameSite=Strict` en la cookie): una escritura con
 * cabecera `Origin` solo se acepta si viene del front (`CORS_ORIGIN`) o del propio servicio. Sin `Origin` no
 * es un navegador (curl, scripts), así que no hay CSRF posible.
 */
export const checkOrigin = (req, _res, next) => {
  const origin = req.get("Origin");
  if (!WRITE_METHODS.has(req.method) || !origin) return next();

  const ownOrigin = `${req.protocol}://${req.get("host")}`;
  if (origin === ownOrigin || env.corsOrigins.includes(origin)) return next();
  next(new ForbiddenError(AI_MESSAGES.ORIGIN_NOT_ALLOWED));
};
