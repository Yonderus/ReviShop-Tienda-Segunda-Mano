import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import { env } from "../config/env.js";
import { AI_MESSAGES, REVIEW_SUMMARY } from "../constants/ai.constants.js";
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

/**
 * Resumen de valoraciones, **por IP** (es público: no hay usuario). Casi todas las peticiones salen de la caché y no
 * cuestan nada; el límite es para que nadie fuerce llamadas al modelo pidiendo perfiles sin parar.
 * `req.ip` es la IP real aunque llegue por el gateway (`trust proxy` en loopback).
 */
export const summaryRateLimit = rateLimit({
  windowMs: HOUR_MS,
  limit: REVIEW_SUMMARY.RATE_LIMIT_PER_HOUR,
  keyGenerator: (req) => `ip:${ipKeyGenerator(req.ip)}`,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (_req, _res, next) => next(new TooManyRequestsError(AI_MESSAGES.TOO_MANY_SUMMARIES)),
});
