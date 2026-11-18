import { rateLimit } from "express-rate-limit";
import { env } from "../config/env.js";
import { AI_MESSAGES } from "../constants/ai.constants.js";
import { TooManyRequestsError } from "../utils/AppError.js";

const HOUR_MS = 60 * 60 * 1000;

/**
 * Límite de mensajes al asistente **por usuario** (va después de `requireSession`, así que siempre hay
 * `req.user`): cada mensaje es una llamada de pago al proveedor. Al pasarse, 429 con el formato de siempre y
 * las cabeceras `RateLimit` / `Retry-After`.
 *
 * Los contadores viven en memoria: se reinician al reiniciar el servicio (para varias instancias haría falta
 * un store compartido, p. ej. Redis).
 */
export const aiRateLimit = rateLimit({
  windowMs: HOUR_MS,
  limit: env.AI_RATE_LIMIT_PER_HOUR,
  keyGenerator: (req) => `user:${req.user.id}`,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (_req, _res, next) => next(new TooManyRequestsError(AI_MESSAGES.TOO_MANY)),
});
