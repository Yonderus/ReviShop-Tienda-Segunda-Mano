import { Router } from "express";
import { createReview } from "../controllers/review.controller.js";
import { cancelSale, confirmSale, getMyPending, getMySales, registerSale, rejectSale } from "../controllers/sale.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { saleRateLimit } from "../middlewares/rateLimit.middleware.js";
import { validate } from "../middlewares/validate.js";
import { idParamsSchema } from "../validators/common.validator.js";
import { createReviewSchema } from "../validators/review.validator.js";
import { mySalesQuerySchema, registerSaleSchema } from "../validators/sale.validator.js";

/** Las ventas: se monta en /api/sales. Todo con sesión; cada venta solo la ven sus dos partes (y un admin). */
const router = Router();

/**
 * @openapi
 * /sales:
 *   post:
 *     tags: [Ventas]
 *     summary: Registrar una venta (el vendedor)
 *     security: [{ cookieAuth: [] }]
 *     description: |
 *       El dueño del producto (o un admin) registra que ha vendido una variante a otro usuario, por su email. La
 *       variante pasa a **vendido** y la venta queda **pending** hasta que el comprador la confirme (7 días).
 *
 *       - **409**: la variante ya tiene una venta pendiente o confirmada.
 *       - **422** en `buyerEmail`: el **mismo** mensaje si no hay cuenta con ese email o si no puede entrar, para no
 *         revelar qué emails existen. Tampoco se puede vender a uno mismo.
 *       - **429**: más de 20 intentos por hora (cuentan también los que fallan).
 *     requestBody:
 *       required: true
 *       content: { application/json: { schema: { $ref: '#/components/schemas/SaleInput' } } }
 *     responses:
 *       201:
 *         description: Venta registrada, pendiente de confirmar
 *         content: { application/json: { schema: { $ref: '#/components/schemas/SaleResponse' } } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/Conflict' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 *       429: { $ref: '#/components/responses/TooManyRequests' }
 */
router.post("/", authenticate, saleRateLimit, validate({ body: registerSaleSchema }), registerSale);

/**
 * @openapi
 * /sales/mine:
 *   get:
 *     tags: [Ventas]
 *     summary: Mi actividad (mis ventas o mis compras)
 *     security: [{ cookieAuth: [] }]
 *     description: Las más recientes primero. Las pendientes que ya pasaron su plazo salen como `expired`.
 *     parameters:
 *       - { name: as, in: query, required: true, schema: { type: string, enum: [seller, buyer] } }
 *       - { name: status, in: query, schema: { type: string, enum: [pending, confirmed, rejected, cancelled, expired] } }
 *       - { name: productId, in: query, description: "Solo las de ese producto", schema: { type: string, pattern: "^[0-9a-fA-F]{24}$" } }
 *       - { $ref: '#/components/parameters/Page' }
 *       - { name: limit, in: query, schema: { type: integer, minimum: 1, maximum: 50, default: 20 } }
 *     responses:
 *       200:
 *         description: Una página de ventas
 *         content: { application/json: { schema: { $ref: '#/components/schemas/SalePageResponse' } } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get("/mine", authenticate, validate({ query: mySalesQuerySchema }), getMySales);

/**
 * @openapi
 * /sales/{id}/confirm:
 *   post:
 *     tags: [Ventas]
 *     summary: Confirmar la compra (el comprador)
 *     security: [{ cookieAuth: [] }]
 *     description: Solo el comprador y solo si está pendiente y sin caducar. Abre la ventana de 72 h para valorarse.
 *     parameters: [{ $ref: '#/components/parameters/SaleId' }]
 *     responses:
 *       200:
 *         description: Venta confirmada
 *         content: { application/json: { schema: { $ref: '#/components/schemas/SaleResponse' } } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/Conflict' }
 */
router.post("/:id/confirm", authenticate, validate({ params: idParamsSchema }), confirmSale);

/**
 * @openapi
 * /sales/{id}/reject:
 *   post:
 *     tags: [Ventas]
 *     summary: Rechazar la venta, «no he sido yo» (el comprador)
 *     security: [{ cookieAuth: [] }]
 *     description: Solo el comprador y solo si está pendiente. La variante vuelve al estado que tenía.
 *     parameters: [{ $ref: '#/components/parameters/SaleId' }]
 *     responses:
 *       200:
 *         description: Venta rechazada
 *         content: { application/json: { schema: { $ref: '#/components/schemas/SaleResponse' } } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/Conflict' }
 */
router.post("/:id/reject", authenticate, validate({ params: idParamsSchema }), rejectSale);

/**
 * @openapi
 * /sales/{id}/cancel:
 *   post:
 *     tags: [Ventas]
 *     summary: Cancelar la venta (el vendedor)
 *     security: [{ cookieAuth: [] }]
 *     description: Solo el vendedor (o un admin) y solo si está pendiente. La variante vuelve al estado que tenía.
 *     parameters: [{ $ref: '#/components/parameters/SaleId' }]
 *     responses:
 *       200:
 *         description: Venta cancelada
 *         content: { application/json: { schema: { $ref: '#/components/schemas/SaleResponse' } } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/Conflict' }
 */
router.post("/:id/cancel", authenticate, validate({ params: idParamsSchema }), cancelSale);

/**
 * @openapi
 * /sales/{id}/review:
 *   post:
 *     tags: [Valoraciones]
 *     summary: Valorar a la otra parte de la venta (ciega, sin edición)
 *     security: [{ cookieAuth: [] }]
 *     description: |
 *       El comprador valora al vendedor (criterios `asDescribed`, `communication`, `punctuality`) y el vendedor al
 *       comprador (`communication`, `punctuality`). Con nota 1 o 2 el comentario es obligatorio (mín. 20 caracteres).
 *
 *       **Ciega:** no se publica hasta que valora el otro o termina la ventana de 72 h; entonces salen las dos a la vez.
 *       No se puede editar.
 *
 *       - **404**: la venta no existe o no eres una de sus partes.
 *       - **409**: la venta no está confirmada, la ventana ya terminó o ya la habías valorado.
 *       - **422**: nota, criterios o comentario no válidos.
 *     parameters: [{ $ref: '#/components/parameters/SaleId' }]
 *     requestBody:
 *       required: true
 *       content: { application/json: { schema: { $ref: '#/components/schemas/ReviewInput' } } }
 *     responses:
 *       201:
 *         description: Guardada (pública ya, o cuando toque)
 *         content: { application/json: { schema: { $ref: '#/components/schemas/OwnReviewResponse' } } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/Conflict' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.post("/:id/review", authenticate, validate({ params: idParamsSchema, body: createReviewSchema }), createReview);

export default router;

/** Lo pendiente del usuario de la sesión: se monta en /api/me. */
export const meRoutes = Router();

/**
 * @openapi
 * /me/pending:
 *   get:
 *     tags: [Ventas]
 *     summary: Lo que tengo pendiente (para el aviso del menú)
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200:
 *         description: Contadores
 *         content: { application/json: { schema: { $ref: '#/components/schemas/PendingResponse' } } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
meRoutes.get("/pending", authenticate, getMyPending);
