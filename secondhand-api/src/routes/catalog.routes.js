import { Router } from "express";
import { getSellers } from "../controllers/catalog.controller.js";

/** Solo lectura: alimenta el select de vendedor del front. Pasará a user.* con el CRUD de usuarios. */

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
