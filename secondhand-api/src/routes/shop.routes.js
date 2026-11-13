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
 *     summary: Catálogo de la tienda con filtros, búsqueda, orden y paginación
 *     description: |
 *       Todos los filtros son opcionales y se combinan (Y). Cada filtro admite **varios valores** (O), separados
 *       por comas (`?condition=nuevo,como_nuevo`) o repitiendo el parámetro (`?condition=nuevo&condition=como_nuevo`).
 *       Un slug que no existe se ignora; si ninguno de un filtro existe, el resultado es vacío.
 *
 *       La búsqueda va en dos pasos: primero palabras completas con el índice de texto (en español) y, si no
 *       encuentra nada, trozos del título sin distinguir tildes. `search.mode` dice cuál se usó (`text` o `partial`).
 *     security: []
 *     parameters:
 *       - { name: category, in: query, description: "Slugs de categoría (incluye sus subcategorías)", schema: { type: string }, example: "moviles,ordenadores" }
 *       - { name: seller, in: query, description: "Slugs de vendedor", schema: { type: string }, example: "lucia-martin" }
 *       - { name: location, in: query, description: "Slugs de ubicación (ver /shop/locations)", schema: { type: string }, example: "valencia,madrid" }
 *       - { name: condition, in: query, description: "Estados de conservación", schema: { type: string }, example: "nuevo,como_nuevo" }
 *       - { name: status, in: query, description: "Estados de venta", schema: { type: string }, example: "disponible" }
 *       - $ref: '#/components/parameters/MinPrice'
 *       - $ref: '#/components/parameters/MaxPrice'
 *       - { name: search, in: query, description: "Texto a buscar (2 a 80 caracteres)", schema: { type: string }, example: "iphone" }
 *       - { name: sort, in: query, description: "recent (por defecto) · price-asc · price-desc · relevance (solo con search; por defecto si se busca)", schema: { type: string, enum: [recent, price-asc, price-desc, relevance] } }
 *       - $ref: '#/components/parameters/Page'
 *       - $ref: '#/components/parameters/Limit'
 *     responses:
 *       200:
 *         description: Una página de productos a la venta
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
