import { Router } from "express";
import { getReports, resolveReport } from "../controllers/review.controller.js";
import { adminOnly } from "../middlewares/admin.middleware.js";
import { validate } from "../middlewares/validate.js";
import { idParamsSchema } from "../validators/common.validator.js";
import { reportListQuerySchema, resolveReportSchema } from "../validators/review.validator.js";

/** Denuncias, para el panel de admin: se monta en /api/reports. Denunciar se hace sobre lo denunciado (/api/reviews/:id/report). */
const router = Router();

/**
 * @openapi
 * /reports:
 *   get:
 *     tags: [Valoraciones]
 *     summary: Panel — denuncias abiertas o resueltas
 *     security: [{ cookieAuth: [] }]
 *     description: |
 *       Cada denuncia con lo denunciado completo (`target`: la valoración, quién la escribió, a quién y si está
 *       oculta), quién denunció, el motivo y cuántas denuncias tiene lo mismo (`reportsOnTarget`). Las abiertas, las
 *       más antiguas primero; las resueltas, las últimas primero. `counts` dice cuántas hay en cada pestaña.
 *     parameters:
 *       - { name: status, in: query, schema: { type: string, enum: [open, resolved], default: open } }
 *       - { $ref: '#/components/parameters/Page' }
 *       - { name: limit, in: query, schema: { type: integer, minimum: 1, maximum: 50, default: 20 } }
 *     responses:
 *       200:
 *         description: Una página de denuncias y los contadores
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ReportPageResponse' } } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get("/", adminOnly, validate({ query: reportListQuerySchema }), getReports);

/**
 * @openapi
 * /reports/{id}:
 *   patch:
 *     tags: [Valoraciones]
 *     summary: Panel — resolver una denuncia
 *     security: [{ cookieAuth: [] }]
 *     description: |
 *       - `dismiss`: la valoración se queda; esta denuncia pasa a `dismissed`.
 *       - `hide`: se oculta la valoración (sale de lo público y de las medias) y todas sus denuncias abiertas pasan a `actioned`.
 *
 *       409 si ya estaba resuelta (o si lo denunciado ya no existe y se pide ocultarlo).
 *     parameters: [{ $ref: '#/components/parameters/ReportId' }]
 *     requestBody:
 *       required: true
 *       content: { application/json: { schema: { type: object, required: [action], properties: { action: { type: string, enum: [dismiss, hide] } } } } }
 *     responses:
 *       200:
 *         description: Resuelta
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/Conflict' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.patch("/:id", adminOnly, validate({ params: idParamsSchema, body: resolveReportSchema }), resolveReport);

export default router;
