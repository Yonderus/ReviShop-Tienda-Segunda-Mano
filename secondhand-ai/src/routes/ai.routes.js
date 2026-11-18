import { Router } from "express";
import { getHealth, postChat } from "../controllers/ai.controller.js";
import { aiRateLimit } from "../middlewares/rateLimit.middleware.js";
import { requireSession } from "../middlewares/session.middleware.js";
import { validate } from "../middlewares/validate.js";
import { chatSchema } from "../validators/ai.validator.js";

const router = Router();

/** Público: si el servicio está vivo y si el asistente puede responder (sin llamar al proveedor). */
router.get("/health", getHealth);

/**
 * Asistente de compra. Orden: primero la sesión (sin ella no hay usuario para el límite), después el límite
 * (cuenta también los mensajes inválidos: no sale gratis probar) y por último la validación.
 */
router.post("/chat", requireSession, aiRateLimit, validate({ body: chatSchema }), postChat);

export default router;
