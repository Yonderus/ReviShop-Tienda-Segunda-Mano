import { Router } from "express";
import {
  changeProductStatus,
  createProduct,
  getActiveProducts,
  getInactiveProducts,
  getProductById,
  getProductBySlug,
  getProducts,
  getTrashedProducts,
  restoreProduct,
  setProductActive,
  softDeleteProduct,
  updateProduct,
} from "../controllers/product.controller.js";
import { adminOnly } from "../middlewares/admin.middleware.js";
import { authenticate, optionalAuthenticate } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.js";
import { idParamsSchema, restoreSchema, setActiveSchema, slugParamsSchema } from "../validators/common.validator.js";
import {
  changeStatusSchema,
  createProductSchema,
  listQuerySchema,
  stateListQuerySchema,
  updateProductSchema,
} from "../validators/product.validator.js";

const router = Router();

// Documentación: cada ruta lleva su bloque @openapi (se publica en /api/docs). Los esquemas
// compartidos están en config/swagger.js.

/**
 * @openapi
 * /products:
 *   get:
 *     tags: [Productos]
 *     summary: Público — catálogo (solo los activos)
 *     security: []
 *     parameters:
 *       - $ref: '#/components/parameters/Category'
 *       - $ref: '#/components/parameters/Seller'
 *       - $ref: '#/components/parameters/Condition'
 *       - $ref: '#/components/parameters/Status'
 *       - $ref: '#/components/parameters/MinPrice'
 *       - $ref: '#/components/parameters/MaxPrice'
 *     responses:
 *       200:
 *         description: Productos, del más reciente al más antiguo
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ProductListResponse' } } }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get("/", validate({ query: listQuerySchema }), getProducts);

/**
 * @openapi
 * /products/actives:
 *   get:
 *     tags: [Productos]
 *     summary: Solo los activos (no eliminados)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/Category'
 *       - $ref: '#/components/parameters/Seller'
 *       - $ref: '#/components/parameters/Condition'
 *       - $ref: '#/components/parameters/Status'
 *       - $ref: '#/components/parameters/MinPrice'
 *       - $ref: '#/components/parameters/MaxPrice'
 *     responses:
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       200:
 *         description: Productos activos
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ProductListResponse' } } }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get("/actives", adminOnly, validate({ query: stateListQuerySchema }), getActiveProducts);

/**
 * @openapi
 * /products/inactives:
 *   get:
 *     tags: [Productos]
 *     summary: Solo los inactivos (ocultos en la tienda, no eliminados)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/Category'
 *       - $ref: '#/components/parameters/Seller'
 *       - $ref: '#/components/parameters/Condition'
 *       - $ref: '#/components/parameters/Status'
 *       - $ref: '#/components/parameters/MinPrice'
 *       - $ref: '#/components/parameters/MaxPrice'
 *     responses:
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       200:
 *         description: Productos inactivos
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ProductListResponse' } } }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get("/inactives", adminOnly, validate({ query: stateListQuerySchema }), getInactiveProducts);

/**
 * @openapi
 * /products/trash:
 *   get:
 *     tags: [Productos]
 *     summary: Papelera (soft delete), del borrado más reciente al más antiguo
 *     security: [{ bearerAuth: [] }]
 *     description: Cada producto muestra solo la portada que se eliminó junto a él.
 *     parameters:
 *       - $ref: '#/components/parameters/Category'
 *       - $ref: '#/components/parameters/Seller'
 *       - $ref: '#/components/parameters/Condition'
 *       - $ref: '#/components/parameters/Status'
 *       - $ref: '#/components/parameters/MinPrice'
 *       - $ref: '#/components/parameters/MaxPrice'
 *     responses:
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       200:
 *         description: Productos eliminados
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ProductListResponse' } } }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get("/trash", adminOnly, validate({ query: stateListQuerySchema }), getTrashedProducts);

/**
 * @openapi
 * /products/slug/{slug}:
 *   get:
 *     tags: [Productos]
 *     summary: Público — detalle por slug
 *     security: [{}, { bearerAuth: [] }]
 *     description: Un producto inactivo solo lo ven su dueño y los admin (con token); al resto, 404. El token es opcional y, si no vale, se ignora.
 *     parameters: [{ $ref: '#/components/parameters/ProductSlug' }]
 *     responses:
 *       200:
 *         description: Producto con todas sus imágenes y variantes
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ProductResponse' } } }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.get("/slug/:slug", optionalAuthenticate, validate({ params: slugParamsSchema }), getProductBySlug);

/**
 * @openapi
 * /products/{id}:
 *   get:
 *     tags: [Productos]
 *     summary: Detalle por id
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ $ref: '#/components/parameters/ProductId' }]
 *     responses:
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       200:
 *         description: Producto con todas sus imágenes y variantes
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ProductResponse' } } }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get("/:id", adminOnly, validate({ params: idParamsSchema }), getProductById);

/**
 * @openapi
 * /products:
 *   post:
 *     tags: [Productos]
 *     summary: Crear un producto
 *     security: [{ bearerAuth: [] }]
 *     description: Genera el slug a partir del título y una variante por defecto.
 *     requestBody:
 *       required: true
 *       content: { application/json: { schema: { $ref: '#/components/schemas/ProductInput' } } }
 *     responses:
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       201:
 *         description: Creado
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ProductResponse' } } }
 *       409: { $ref: '#/components/responses/Conflict' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.post("/", authenticate, validate({ body: createProductSchema }), createProduct);

/**
 * @openapi
 * /products/{id}:
 *   patch:
 *     tags: [Productos]
 *     summary: Actualización parcial
 *     security: [{ bearerAuth: [] }]
 *     description: Solo los campos enviados. El estado de venta no se cambia aquí, sino en /products/{id}/status.
 *     parameters: [{ $ref: '#/components/parameters/ProductId' }]
 *     requestBody:
 *       required: true
 *       content: { application/json: { schema: { $ref: '#/components/schemas/ProductInput' } } }
 *     responses:
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       200:
 *         description: Actualizado
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ProductResponse' } } }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/Conflict' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.patch("/:id", authenticate, validate({ params: idParamsSchema, body: updateProductSchema }), updateProduct);

/**
 * @openapi
 * /products/{id}/status:
 *   patch:
 *     tags: [Productos]
 *     summary: Cambiar el estado de venta
 *     security: [{ bearerAuth: [] }]
 *     description: Solo si el producto tiene una única variante (422 si tiene varias).
 *     parameters: [{ $ref: '#/components/parameters/ProductId' }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/StatusInput' }
 *     responses:
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       200:
 *         description: Estado cambiado
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ProductResponse' } } }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.patch("/:id/status", authenticate, validate({ params: idParamsSchema, body: changeStatusSchema }), changeProductStatus);

/**
 * @openapi
 * /products/{id}/active:
 *   patch:
 *     tags: [Productos]
 *     summary: Activar o desactivar (visibilidad en la tienda)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ $ref: '#/components/parameters/ProductId' }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ActiveInput' }
 *     responses:
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       200:
 *         description: Visibilidad cambiada
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ProductResponse' } } }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/Conflict' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.patch("/:id/active", authenticate, validate({ params: idParamsSchema, body: setActiveSchema }), setProductActive);

/**
 * @openapi
 * /products/{id}/restore:
 *   patch:
 *     tags: [Productos]
 *     summary: Restaurar desde la papelera
 *     security: [{ bearerAuth: [] }]
 *     description: Vuelve inactivo salvo que se envíe isActive true. Recupera solo las variantes e imágenes eliminadas con él.
 *     parameters: [{ $ref: '#/components/parameters/ProductId' }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/RestoreInput' }
 *     responses:
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       200:
 *         description: Restaurado
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ProductResponse' } } }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/Conflict' }
 */
router.patch("/:id/restore", adminOnly, validate({ params: idParamsSchema, body: restoreSchema }), restoreProduct);

/**
 * @openapi
 * /products/{id}:
 *   delete:
 *     tags: [Productos]
 *     summary: Mover a la papelera (soft delete)
 *     security: [{ bearerAuth: [] }]
 *     description: También sus variantes e imágenes, con la misma fecha.
 *     parameters: [{ $ref: '#/components/parameters/ProductId' }]
 *     responses:
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       204: { description: Eliminado }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.delete("/:id", authenticate, validate({ params: idParamsSchema }), softDeleteProduct);

export default router;
