import { Router } from "express";
import { getHealth, getSellerSummary, postChat, postListingDraft } from "../controllers/ai.controller.js";
import { aiRateLimit, summaryRateLimit } from "../middlewares/rateLimit.middleware.js";
import { requireSession } from "../middlewares/session.middleware.js";
import { validate } from "../middlewares/validate.js";
import { chatSchema, listingDraftSchema, sellerSlugParamsSchema } from "../validators/ai.validator.js";

const router = Router();

/** Público: si el servicio está vivo y si el asistente puede responder (sin llamar al proveedor). */
router.get("/health", getHealth);

/*
 * Orden: primero la sesión (sin ella no hay usuario para el límite), después el límite (cuenta también los
 * mensajes inválidos: no sale gratis probar) y por último la validación. El límite es el MISMO middleware
 * (mismo contador) para el chat y el anuncio: el presupuesto es por usuario, no por pantalla.
 */

/** Asistente de compra. */
router.post("/chat", requireSession, aiRateLimit, validate({ body: chatSchema }), postChat);

/** Asistente de anuncio: descripción sugerida y rango de precio. No guarda nada. */
router.post("/listings/draft", requireSession, aiRateLimit, validate({ body: listingDraftSchema }), postListingDraft);

/**
 * Resumen de las valoraciones de un vendedor («Lo que dicen de…»). Público, como su perfil: sin sesión, con límite
 * por IP y caché (solo se paga una llamada al modelo por cada valoración nueva).
 */
router.get("/sellers/:slug/summary", summaryRateLimit, validate({ params: sellerSlugParamsSchema }), getSellerSummary);

export default router;
