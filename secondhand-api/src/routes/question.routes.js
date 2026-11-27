import { Router } from "express";
import {
  answerQuestion,
  askQuestion,
  deleteQuestion,
  getMyUnansweredQuestions,
  reportQuestion,
  setQuestionHidden,
} from "../controllers/question.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { questionRateLimit, reportRateLimit } from "../middlewares/rateLimit.middleware.js";
import { validate } from "../middlewares/validate.js";
import { idParamsSchema } from "../validators/common.validator.js";
import { answerQuestionSchema, askQuestionSchema, setQuestionHiddenSchema } from "../validators/question.validator.js";
import { reportSchema } from "../validators/review.validator.js";

/**
 * Preguntar en un anuncio: se monta en /api/products/:id/questions (mergeParams para leer el :id). El listado público
 * va con la tienda (`GET /api/shop/products/:slug/questions`).
 */
export const productQuestionsRoutes = Router({ mergeParams: true });

/**
 * @openapi
 * /products/{id}/questions:
 *   post:
 *     tags: [Preguntas]
 *     summary: Preguntar en un anuncio
 *     security: [{ cookieAuth: [] }]
 *     description: Cualquiera con sesión menos el vendedor (403). El anuncio tiene que estar a la venta (404). Como mucho 10 por hora (429).
 *     parameters: [{ $ref: '#/components/parameters/ProductId' }]
 *     requestBody:
 *       required: true
 *       content: { application/json: { schema: { type: object, required: [text], properties: { text: { type: string, minLength: 5, maxLength: 300 } } } } }
 *     responses:
 *       201:
 *         description: Pregunta publicada
 *         content: { application/json: { schema: { $ref: '#/components/schemas/QuestionResponse' } } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 *       429: { $ref: '#/components/responses/TooManyRequests' }
 */
productQuestionsRoutes.post("/", authenticate, questionRateLimit, validate({ params: idParamsSchema, body: askQuestionSchema }), askQuestion);

/** Una pregunta concreta: se monta en /api/questions. */
const router = Router();

/**
 * @openapi
 * /questions/mine/unanswered:
 *   get:
 *     tags: [Preguntas]
 *     summary: Las preguntas sin responder de mis anuncios
 *     security: [{ cookieAuth: [] }]
 *     description: Visibles y sin respuesta, las más antiguas primero, con el producto (título y slug).
 *     responses:
 *       200:
 *         description: Lista
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
router.get("/mine/unanswered", authenticate, getMyUnansweredQuestions);

/**
 * @openapi
 * /questions/{id}/answer:
 *   post:
 *     tags: [Preguntas]
 *     summary: Responder (el vendedor, una vez)
 *     security: [{ cookieAuth: [] }]
 *     description: Solo el vendedor del anuncio (o un admin) y una sola vez (409 si ya tiene respuesta).
 *     parameters: [{ $ref: '#/components/parameters/QuestionId' }]
 *     requestBody:
 *       required: true
 *       content: { application/json: { schema: { type: object, required: [text], properties: { text: { type: string, maxLength: 500 } } } } }
 *     responses:
 *       200:
 *         description: Respondida
 *         content: { application/json: { schema: { $ref: '#/components/schemas/QuestionResponse' } } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/Conflict' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.post("/:id/answer", authenticate, validate({ params: idParamsSchema, body: answerQuestionSchema }), answerQuestion);

/**
 * @openapi
 * /questions/{id}/hidden:
 *   patch:
 *     tags: [Preguntas]
 *     summary: Ocultar o volver a mostrar (el vendedor o un admin)
 *     security: [{ cookieAuth: [] }]
 *     parameters: [{ $ref: '#/components/parameters/QuestionId' }]
 *     requestBody:
 *       required: true
 *       content: { application/json: { schema: { type: object, required: [hidden], properties: { hidden: { type: boolean }, reason: { type: string, maxLength: 300 } } } } }
 *     responses:
 *       200:
 *         description: Hecho
 *         content: { application/json: { schema: { $ref: '#/components/schemas/QuestionResponse' } } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.patch("/:id/hidden", authenticate, validate({ params: idParamsSchema, body: setQuestionHiddenSchema }), setQuestionHidden);

/**
 * @openapi
 * /questions/{id}:
 *   delete:
 *     tags: [Preguntas]
 *     summary: Borrar mi pregunta (si aún no tiene respuesta)
 *     security: [{ cookieAuth: [] }]
 *     parameters: [{ $ref: '#/components/parameters/QuestionId' }]
 *     responses:
 *       204:
 *         description: Borrada
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/Conflict' }
 */
router.delete("/:id", authenticate, validate({ params: idParamsSchema }), deleteQuestion);

/**
 * @openapi
 * /questions/{id}/report:
 *   post:
 *     tags: [Preguntas]
 *     summary: Denunciar una pregunta
 *     security: [{ cookieAuth: [] }]
 *     description: Cualquiera con sesión menos quien la hizo, una vez (409). Las ocultas dan 404. Comparte el límite de 20 denuncias por hora.
 *     parameters: [{ $ref: '#/components/parameters/QuestionId' }]
 *     requestBody:
 *       required: true
 *       content: { application/json: { schema: { $ref: '#/components/schemas/ReportInput' } } }
 *     responses:
 *       201:
 *         description: Denuncia registrada
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/Conflict' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 *       429: { $ref: '#/components/responses/TooManyRequests' }
 */
router.post("/:id/report", authenticate, reportRateLimit, validate({ params: idParamsSchema, body: reportSchema }), reportQuestion);

export default router;
