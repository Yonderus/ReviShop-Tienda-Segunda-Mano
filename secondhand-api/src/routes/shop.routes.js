import { Router } from "express";
import {
  getShopCategories,
  getShopLocations,
  getShopProduct,
  getShopProducts,
  getShopSellers,
} from "../controllers/shop.controller.js";
import { validate } from "../middlewares/validate.js";
import { slugParamsSchema } from "../validators/common.validator.js";
import { shopListQuerySchema } from "../validators/shop.validator.js";

// Tienda pública (Home y Shop): todo es público y de solo lectura, y nunca devuelve nada inactivo ni
// eliminado. El CRUD de productos (vendedores y panel) sigue en /products.
const router = Router();

/**
 * @openapi
 * /shop/products:
 *   get:
 *     tags: [Tienda]
 *     summary: Catálogo de la tienda, paginado
 *     security: []
 *     parameters:
 *       - $ref: '#/components/parameters/Page'
 *       - $ref: '#/components/parameters/Limit'
 *     responses:
 *       200:
 *         description: Una página de productos a la venta, de lo más reciente a lo más antiguo
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ShopProductPageResponse' } } }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get("/products", validate({ query: shopListQuerySchema }), getShopProducts);

/**
 * @openapi
 * /shop/products/{slug}:
 *   get:
 *     tags: [Tienda]
 *     summary: Ficha de un producto a la venta
 *     description: Con todas sus fotos y solo las variantes activas. Un producto inactivo o eliminado da 404.
 *     security: []
 *     parameters:
 *       - $ref: '#/components/parameters/ProductSlug'
 *     responses:
 *       200:
 *         description: El producto
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ProductResponse' } } }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.get("/products/:slug", validate({ params: slugParamsSchema }), getShopProduct);

/**
 * @openapi
 * /shop/categories:
 *   get:
 *     tags: [Tienda]
 *     summary: Categorías para el Home, con cuántos productos hay a la venta
 *     description: Publicadas y activas. Una principal cuenta también los productos de sus subcategorías.
 *     security: []
 *     responses:
 *       200:
 *         description: Categorías
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ShopCategoryListResponse' } } }
 */
router.get("/categories", getShopCategories);

/**
 * @openapi
 * /shop/sellers:
 *   get:
 *     tags: [Tienda]
 *     summary: Vendedores para el Home
 *     description: Activos, no suspendidos y con al menos un producto a la venta; los que más venden primero.
 *     security: []
 *     responses:
 *       200:
 *         description: Vendedores
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ShopSellerListResponse' } } }
 */
router.get("/sellers", getShopSellers);

/**
 * @openapi
 * /shop/locations:
 *   get:
 *     tags: [Tienda]
 *     summary: Ubicaciones para el Home
 *     description: Las ubicaciones con productos a la venta, sin distinguir mayúsculas ni tildes; las que más tienen primero.
 *     security: []
 *     responses:
 *       200:
 *         description: Ubicaciones
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ShopLocationListResponse' } } }
 */
router.get("/locations", getShopLocations);

export default router;
