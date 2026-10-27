import { Router } from "express";
import {
  createCategory,
  getActiveCategories,
  getCategories,
  getCategoryById,
  getCategoryBySlug,
  getInactiveCategories,
  getTrashedCategories,
  restoreCategory,
  setCategoryActive,
  softDeleteCategory,
  updateCategory,
} from "../controllers/category.controller.js";
import { validate } from "../middlewares/validate.js";
import { adminListQuerySchema, createCategorySchema, updateCategorySchema } from "../validators/category.validator.js";
import { idParamsSchema, restoreSchema, setActiveSchema, slugParamsSchema } from "../validators/common.validator.js";

const router = Router();

/**
 * @openapi
 * /categories:
 *   get:
 *     tags: [Categorías]
 *     summary: Público — categorías publicadas y activas
 *     description: Las usan los select y filtros de la tienda. Las hijas llevan parentId.
 *     responses:
 *       200:
 *         description: Categorías
 *         content: { application/json: { schema: { $ref: '#/components/schemas/CategoryListResponse' } } }
 */
router.get("/", getCategories);

/**
 * @openapi
 * /categories/actives:
 *   get:
 *     tags: [Categorías]
 *     summary: Panel — activas (borradores incluidos)
 *     parameters: [{ $ref: '#/components/parameters/CategoryStatus' }]
 *     responses:
 *       200:
 *         description: Con nº de productos y de subcategorías
 *         content: { application/json: { schema: { $ref: '#/components/schemas/CategoryAdminListResponse' } } }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get("/actives", validate({ query: adminListQuerySchema }), getActiveCategories);

/**
 * @openapi
 * /categories/inactives:
 *   get:
 *     tags: [Categorías]
 *     summary: Panel — inactivas (no se ofrecen en la tienda)
 *     parameters: [{ $ref: '#/components/parameters/CategoryStatus' }]
 *     responses:
 *       200:
 *         description: Con nº de productos y de subcategorías
 *         content: { application/json: { schema: { $ref: '#/components/schemas/CategoryAdminListResponse' } } }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get("/inactives", validate({ query: adminListQuerySchema }), getInactiveCategories);

/**
 * @openapi
 * /categories/trash:
 *   get:
 *     tags: [Categorías]
 *     summary: Panel — papelera, de la eliminada más reciente a la más antigua
 *     parameters: [{ $ref: '#/components/parameters/CategoryStatus' }]
 *     responses:
 *       200:
 *         description: Categorías eliminadas
 *         content: { application/json: { schema: { $ref: '#/components/schemas/CategoryAdminListResponse' } } }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get("/trash", validate({ query: adminListQuerySchema }), getTrashedCategories);

/**
 * @openapi
 * /categories/slug/{slug}:
 *   get:
 *     tags: [Categorías]
 *     summary: Detalle por slug
 *     parameters: [{ name: slug, in: path, required: true, schema: { type: string, example: moviles } }]
 *     responses:
 *       200:
 *         description: Categoría con nº de productos y de subcategorías
 *         content: { application/json: { schema: { $ref: '#/components/schemas/CategoryResponse' } } }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.get("/slug/:slug", validate({ params: slugParamsSchema }), getCategoryBySlug);

/**
 * @openapi
 * /categories/{id}:
 *   get:
 *     tags: [Categorías]
 *     summary: Detalle por id
 *     parameters: [{ $ref: '#/components/parameters/CategoryId' }]
 *     responses:
 *       200:
 *         description: Categoría con nº de productos y de subcategorías
 *         content: { application/json: { schema: { $ref: '#/components/schemas/CategoryResponse' } } }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get("/:id", validate({ params: idParamsSchema }), getCategoryById);

/**
 * @openapi
 * /categories:
 *   post:
 *     tags: [Categorías]
 *     summary: Crear una categoría
 *     description: Dos niveles como máximo. Nace en borrador salvo que se envíe status published.
 *     requestBody:
 *       required: true
 *       content: { application/json: { schema: { $ref: '#/components/schemas/CategoryInput' } } }
 *     responses:
 *       201:
 *         description: Creada
 *         content: { application/json: { schema: { $ref: '#/components/schemas/CategoryResponse' } } }
 *       409: { $ref: '#/components/responses/Conflict' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.post("/", validate({ body: createCategorySchema }), createCategory);

/**
 * @openapi
 * /categories/{id}:
 *   patch:
 *     tags: [Categorías]
 *     summary: Actualización parcial
 *     description: Si cambia el nombre, cambia el slug. Una categoría con subcategorías no puede pasar a ser hija.
 *     parameters: [{ $ref: '#/components/parameters/CategoryId' }]
 *     requestBody:
 *       required: true
 *       content: { application/json: { schema: { $ref: '#/components/schemas/CategoryInput' } } }
 *     responses:
 *       200:
 *         description: Actualizada
 *         content: { application/json: { schema: { $ref: '#/components/schemas/CategoryResponse' } } }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/Conflict' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.patch("/:id", validate({ params: idParamsSchema, body: updateCategorySchema }), updateCategory);

/**
 * @openapi
 * /categories/{id}/active:
 *   patch:
 *     tags: [Categorías]
 *     summary: Activar o desactivar
 *     description: Una categoría inactiva no sale en la tienda ni admite productos nuevos; los que ya tiene se quedan.
 *     parameters: [{ $ref: '#/components/parameters/CategoryId' }]
 *     requestBody:
 *       required: true
 *       content: { application/json: { schema: { $ref: '#/components/schemas/ActiveInput' } } }
 *     responses:
 *       200:
 *         description: Visibilidad cambiada
 *         content: { application/json: { schema: { $ref: '#/components/schemas/CategoryResponse' } } }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/Conflict' }
 */
router.patch("/:id/active", validate({ params: idParamsSchema, body: setActiveSchema }), setCategoryActive);

/**
 * @openapi
 * /categories/{id}/restore:
 *   patch:
 *     tags: [Categorías]
 *     summary: Restaurar desde la papelera
 *     description: Vuelve inactiva salvo isActive true. Una subcategoría necesita que su padre no esté en la papelera.
 *     parameters: [{ $ref: '#/components/parameters/CategoryId' }]
 *     requestBody:
 *       content: { application/json: { schema: { $ref: '#/components/schemas/RestoreInput' } } }
 *     responses:
 *       200:
 *         description: Restaurada
 *         content: { application/json: { schema: { $ref: '#/components/schemas/CategoryResponse' } } }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/Conflict' }
 */
router.patch("/:id/restore", validate({ params: idParamsSchema, body: restoreSchema }), restoreCategory);

/**
 * @openapi
 * /categories/{id}:
 *   delete:
 *     tags: [Categorías]
 *     summary: Mover a la papelera (soft delete)
 *     description: 409 si tiene productos o subcategorías (dice cuántos).
 *     parameters: [{ $ref: '#/components/parameters/CategoryId' }]
 *     responses:
 *       204: { description: Eliminada }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/Conflict' }
 */
router.delete("/:id", validate({ params: idParamsSchema }), softDeleteCategory);

export default router;
