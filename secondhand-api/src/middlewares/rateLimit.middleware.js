import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import { AUTH_MESSAGES, LOGIN_RATE_LIMIT } from "../constants/auth.constants.js";
import { TooManyRequestsError } from "../utils/AppError.js";

/*
 * Límite de intentos de login (contra quien prueba contraseñas). Solo cuentan los fallidos
 * (`skipSuccessfulRequests`): quien entra bien nunca se bloquea. Al pasarse, 429 con el formato de error de
 * siempre y las cabeceras `RateLimit` / `Retry-After` (cuánto falta).
 *
 * Los contadores viven en memoria: se reinician al reiniciar la API y no se comparten entre varias instancias
 * (para eso haría falta un store compartido, p. ej. Redis). `req.ip` es la IP real del cliente aunque llegue por
 * el API Gateway: server.js confía en el X-Forwarded-For de los proxies locales (`trust proxy: "loopback"`) y el
 * gateway pone ahí la IP de quien se le conecta, sin fiarse de la que diga el cliente.
 */

// `ipKeyGenerator` agrupa las IPv6 de una misma red: cambiar de dirección dentro de ella no esquiva el límite.
const clientIp = (req) => ipKeyGenerator(req.ip);
const emailOf = (req) => String(req.body?.email ?? "").trim().toLowerCase();

const tooMany = (_req, _res, next) => next(new TooManyRequestsError(AUTH_MESSAGES.TOO_MANY_ATTEMPTS));

const loginLimiter = (limit, keyGenerator) =>
  rateLimit({
    windowMs: LOGIN_RATE_LIMIT.WINDOW_MS,
    limit,
    keyGenerator,
    skipSuccessfulRequests: true,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: tooMany,
  });

/** Los dos límites del login: por cuenta (IP + email) y por IP. */
export const loginRateLimit = [
  loginLimiter(LOGIN_RATE_LIMIT.PER_ACCOUNT, (req) => `${clientIp(req)}|${emailOf(req)}`),
  loginLimiter(LOGIN_RATE_LIMIT.PER_IP, clientIp),
];
