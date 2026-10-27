import { Router } from "express";
import { getRoles } from "../controllers/role.controller.js";

const router = Router();

/**
 * @openapi
 * /roles:
 *   get:
 *     tags: [Usuarios]
 *     summary: Roles que se pueden asignar (activos y no obsoletos)
 *     description: Para el select de rol del panel. No hay CRUD de roles.
 *     responses:
 *       200:
 *         description: Roles
 *         content: { application/json: { schema: { $ref: '#/components/schemas/RoleListResponse' } } }
 */
router.get("/", getRoles);

export default router;
