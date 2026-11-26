import { Router } from "express";
import { replyToReview, reportReview } from "../controllers/review.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { reportRateLimit } from "../middlewares/rateLimit.middleware.js";
import { validate } from "../middlewares/validate.js";
import { idParamsSchema } from "../validators/common.validator.js";
import { replySchema, reportSchema } from "../validators/review.validator.js";

/**
 * Una valoración ya escrita: responder y denunciar. Se monta en /api/reviews. Valorar se hace sobre la venta
 * (`POST /api/sales/:id/review`) y el listado público va con la tienda (`/api/shop/sellers/:slug/reviews`).
 */
const router = Router();

/**
 * @openapi
 * /reviews/{id}/reply:
 *   post:
 *     tags: [Valoraciones]
 *     summary: Responder a una valoración (el valorado, una vez)
 *     security: [{ cookieAuth: [] }]
 *     description: Solo la persona valorada, una sola vez y cuando la valoración ya es pública (409 si no).
 *     parameters: [{ $ref: '#/components/parameters/ReviewId' }]
 *     requestBody:
 *       required: true
 *       content: { application/json: { schema: { type: object, required: [text], properties: { text: { type: string, maxLength: 500 } } } } }
 *     responses:
 *       200:
 *         description: Respondida
 *         content: { application/json: { schema: { $ref: '#/components/schemas/PublicReviewResponse' } } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/Conflict' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.post("/:id/reply", authenticate, validate({ params: idParamsSchema, body: replySchema }), replyToReview);

/**
 * @openapi
 * /reviews/{id}/report:
 *   post:
 *     tags: [Valoraciones]
 *     summary: Denunciar una valoración
 *     security: [{ cookieAuth: [] }]
 *     description: |
 *       Cualquiera con sesión, salvo quien la escribió, y una vez por valoración (409). Solo las públicas: una que
 *       aún no se ve (sistema ciego) o que está oculta da 404. Más de 20 denuncias por hora → 429.
 *     parameters: [{ $ref: '#/components/parameters/ReviewId' }]
 *     requestBody:
 *       required: true
 *       content: { application/json: { schema: { $ref: '#/components/schemas/ReportInput' } } }
 *     responses:
 *       201:
 *         description: Denuncia registrada (la revisa un admin)
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/Conflict' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 *       429: { $ref: '#/components/responses/TooManyRequests' }
 */
router.post("/:id/report", authenticate, reportRateLimit, validate({ params: idParamsSchema, body: reportSchema }), reportReview);

export default router;
