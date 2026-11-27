import { Router } from "express";
import {
  getShopCategories,
  getShopLocations,
  getShopProduct,
  getShopProductVariants,
  getShopProducts,
  getShopSellers,
} from "../controllers/shop.controller.js";
import { getProductQuestions } from "../controllers/question.controller.js";
import { getPublicProfile, getPublicReviews } from "../controllers/review.controller.js";
import { optionalAuthenticate } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.js";
import { slugParamsSchema } from "../validators/common.validator.js";
import { publicReviewsQuerySchema } from "../validators/review.validator.js";
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
 * /shop/products/{slug}/variants:
 *   get:
 *     tags: [Tienda]
 *     summary: Variantes que se pueden elegir de un producto a la venta
 *     description: Solo las activas, en su orden, con precio (null = el base), stock, estado y fotos. Si el producto no está a la venta, 404.
 *     security: []
 *     parameters:
 *       - $ref: '#/components/parameters/ProductSlug'
 *     responses:
 *       200:
 *         description: Variantes
 *         content: { application/json: { schema: { $ref: '#/components/schemas/VariantListResponse' } } }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.get("/products/:slug/variants", validate({ params: slugParamsSchema }), getShopProductVariants);

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
/**
 * @openapi
 * /shop/products/{slug}/questions:
 *   get:
 *     tags: [Preguntas]
 *     summary: Preguntas y respuestas de un anuncio
 *     security: [{}, { cookieAuth: [] }]
 *     description: |
 *       Las respondidas primero. Público; con sesión, cada pregunta trae `can` (qué puedes hacer con ella). El vendedor
 *       y los admin ven también las ocultas (`hidden: true`), para poder volver a mostrarlas. 404 si no está a la venta.
 *     parameters: [{ $ref: '#/components/parameters/ProductSlug' }]
 *     responses:
 *       200:
 *         description: Preguntas
 *         content: { application/json: { schema: { $ref: '#/components/schemas/QuestionListResponse' } } }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.get("/products/:slug/questions", optionalAuthenticate, validate({ params: slugParamsSchema }), getProductQuestions);

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
 * /shop/sellers/{slug}:
 *   get:
 *     tags: [Valoraciones]
 *     summary: Perfil público de un usuario
 *     description: |
 *       Nombre, avatar, ubicación, desde cuándo está, cuántas ventas ha cerrado (confirmadas) y sus medias como
 *       vendedor y como comprador: nota media, número, distribución de 5 a 1 estrellas y media de cada criterio.
 *       Solo cuentan las valoraciones públicas (fin del sistema ciego) y no ocultas. 404 si no existe, está
 *       desactivado o suspendido.
 *     security: []
 *     parameters: [{ $ref: '#/components/parameters/UserSlug' }]
 *     responses:
 *       200:
 *         description: Perfil
 *         content: { application/json: { schema: { $ref: '#/components/schemas/PublicProfileResponse' } } }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.get("/sellers/:slug", validate({ params: slugParamsSchema }), getPublicProfile);

/**
 * @openapi
 * /shop/sellers/{slug}/reviews:
 *   get:
 *     tags: [Valoraciones]
 *     summary: Valoraciones públicas de un usuario
 *     description: Como vendedor (`role=seller`, por defecto) o como comprador. Las más recientes primero; `rating` filtra por estrellas.
 *     security: []
 *     parameters:
 *       - { $ref: '#/components/parameters/UserSlug' }
 *       - { name: role, in: query, schema: { type: string, enum: [seller, buyer], default: seller } }
 *       - { name: rating, in: query, schema: { type: integer, minimum: 1, maximum: 5 } }
 *       - { $ref: '#/components/parameters/Page' }
 *       - { name: limit, in: query, schema: { type: integer, minimum: 1, maximum: 50, default: 10 } }
 *     responses:
 *       200:
 *         description: Una página de valoraciones
 *         content: { application/json: { schema: { $ref: '#/components/schemas/PublicReviewPageResponse' } } }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get("/sellers/:slug/reviews", validate({ params: slugParamsSchema, query: publicReviewsQuerySchema }), getPublicReviews);

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
