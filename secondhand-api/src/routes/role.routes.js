import { Router } from "express";
import { getRoles } from "../controllers/role.controller.js";
import { adminOnly } from "../middlewares/admin.middleware.js";

const router = Router();

/**
 * @openapi
 * /roles:
 *   get:
 *     tags: [Usuarios]
 *     summary: Roles que se pueden asignar (activos y no obsoletos)
 *     security: [{ bearerAuth: [] }]
 *     description: Para el select de rol del panel. No hay CRUD de roles.
 *     responses:
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       200:
 *         description: Roles
 *         content: { application/json: { schema: { $ref: '#/components/schemas/RoleListResponse' } } }
 */
router.get("/", adminOnly, getRoles);

export default router;
