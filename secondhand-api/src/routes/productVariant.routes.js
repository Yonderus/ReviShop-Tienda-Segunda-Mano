import { Router } from "express";
import {
  changeVariantStatus,
  createProductVariant,
  getProductVariants,
  setVariantActive,
  softDeleteVariant,
  updateVariant,
} from "../controllers/productVariant.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.js";
import { idParamsSchema, setActiveSchema } from "../validators/common.validator.js";
import { changeStatusSchema } from "../validators/product.validator.js";
import { createVariantSchema, updateVariantSchema } from "../validators/productVariant.validator.js";

/** Las variantes de un producto: se monta en /api/products/:id/variants (mergeParams para leer el :id). */
export const productVariantsOfProductRoutes = Router({ mergeParams: true });

/**
 * @openapi
 * /products/{id}/variants:
 *   get:
 *     tags: [Variantes]
 *     summary: Variantes no eliminadas de un producto
 *     security: []
 *     parameters: [{ $ref: '#/components/parameters/ProductId' }]
 *     responses:
 *       200:
 *         description: Variantes, por orden
 *         content: { application/json: { schema: { $ref: '#/components/schemas/VariantListResponse' } } }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
productVariantsOfProductRoutes.get("/", validate({ params: idParamsSchema }), getProductVariants);

/**
 * @openapi
 * /products/{id}/variants:
 *   post:
 *     tags: [Variantes]
 *     summary: Crear una variante
 *     security: [{ bearerAuth: [] }]
 *     description: >
 *       Las opciones tienen que ser atributos de la categoría del producto (o de su padre). La primera variante
 *       con opciones sustituye a la "Única". Si coincide con una variante eliminada, se recupera esa.
 *     parameters: [{ $ref: '#/components/parameters/ProductId' }]
 *     requestBody:
 *       required: true
 *       content: { application/json: { schema: { $ref: '#/components/schemas/VariantInput' } } }
 *     responses:
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       201:
 *         description: Creada (o recuperada)
 *         content: { application/json: { schema: { $ref: '#/components/schemas/VariantResponse' } } }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/Conflict' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
productVariantsOfProductRoutes.post("/", authenticate, validate({ params: idParamsSchema, body: createVariantSchema }), createProductVariant);

/** Una variante concreta: se monta en /api/variants. */
export const productVariantRoutes = Router();

/**
 * @openapi
 * /variants/{id}:
 *   patch:
 *     tags: [Variantes]
 *     summary: Cambiar precio o stock
 *     security: [{ bearerAuth: [] }]
 *     description: Las opciones no se pueden cambiar (cambiarían el SKU).
 *     parameters: [{ $ref: '#/components/parameters/VariantId' }]
 *     requestBody:
 *       required: true
 *       content: { application/json: { schema: { $ref: '#/components/schemas/VariantUpdate' } } }
 *     responses:
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       200:
 *         description: Actualizada
 *         content: { application/json: { schema: { $ref: '#/components/schemas/VariantResponse' } } }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
productVariantRoutes.patch("/:id", authenticate, validate({ params: idParamsSchema, body: updateVariantSchema }), updateVariant);

/**
 * @openapi
 * /variants/{id}/status:
 *   patch:
 *     tags: [Variantes]
 *     summary: Cambiar el estado de venta
 *     security: [{ bearerAuth: [] }]
 *     description: El estado del producto se recalcula a partir de sus variantes.
 *     parameters: [{ $ref: '#/components/parameters/VariantId' }]
 *     requestBody:
 *       required: true
 *       content: { application/json: { schema: { $ref: '#/components/schemas/StatusInput' } } }
 *     responses:
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       200:
 *         description: Estado cambiado
 *         content: { application/json: { schema: { $ref: '#/components/schemas/VariantResponse' } } }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
productVariantRoutes.patch("/:id/status", authenticate, validate({ params: idParamsSchema, body: changeStatusSchema }), changeVariantStatus);

/**
 * @openapi
 * /variants/{id}/active:
 *   patch:
 *     tags: [Variantes]
 *     summary: Activar o desactivar
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ $ref: '#/components/parameters/VariantId' }]
 *     requestBody:
 *       required: true
 *       content: { application/json: { schema: { $ref: '#/components/schemas/ActiveInput' } } }
 *     responses:
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       200:
 *         description: Visibilidad cambiada
 *         content: { application/json: { schema: { $ref: '#/components/schemas/VariantResponse' } } }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
productVariantRoutes.patch("/:id/active", authenticate, validate({ params: idParamsSchema, body: setActiveSchema }), setVariantActive);

/**
 * @openapi
 * /variants/{id}:
 *   delete:
 *     tags: [Variantes]
 *     summary: Mover a la papelera (soft delete), con sus imágenes
 *     security: [{ bearerAuth: [] }]
 *     description: No se puede eliminar la última variante de un producto (409).
 *     parameters: [{ $ref: '#/components/parameters/VariantId' }]
 *     responses:
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       204: { description: Eliminada }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/Conflict' }
 */
productVariantRoutes.delete("/:id", authenticate, validate({ params: idParamsSchema }), softDeleteVariant);
