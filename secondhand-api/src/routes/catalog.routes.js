import { Router } from "express";
import { getCategories, getSellers } from "../controllers/catalog.controller.js";

/** Solo lectura: alimentan los select del front. No hay CRUD de categorías ni de usuarios. */

/**
 * @openapi
 * /categories:
 *   get:
 *     tags: [Catálogo]
 *     summary: Categorías publicadas y activas
 *     description: Raíces y subcategorías, ordenadas. Las hijas llevan parentId.
 *     responses:
 *       200:
 *         description: Categorías
 *         content: { application/json: { schema: { $ref: '#/components/schemas/CategoryListResponse' } } }
 */
export const categoryRoutes = Router().get("/", getCategories);

/**
 * @openapi
 * /sellers:
 *   get:
 *     tags: [Catálogo]
 *     summary: Quién puede publicar
 *     description: Usuarios activos y no suspendidos (en Revishop cualquier usuario compra y vende). Solo campos públicos.
 *     responses:
 *       200:
 *         description: Vendedores
 *         content: { application/json: { schema: { $ref: '#/components/schemas/SellerListResponse' } } }
 */
export const sellerRoutes = Router().get("/", getSellers);
