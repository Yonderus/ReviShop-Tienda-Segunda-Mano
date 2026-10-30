import { Router } from "express";
import { getMe, login, logout } from "../controllers/auth.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { loginRateLimit } from "../middlewares/rateLimit.middleware.js";
import { validate } from "../middlewares/validate.js";
import { loginSchema } from "../validators/auth.validator.js";

const router = Router();

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Iniciar sesión
 *     security: []
 *     description: |
 *       Devuelve un JWT (cabecera `Authorization: Bearer <token>` en las demás peticiones) y el usuario.
 *       Email inexistente o contraseña mala → 401 con el mismo mensaje. Cuenta inactiva, suspendida o
 *       eliminada → 403. Límite de intentos fallidos cada 15 minutos (10 por IP y email, 50 por IP) → 429.
 *     requestBody:
 *       required: true
 *       content: { application/json: { schema: { $ref: '#/components/schemas/LoginInput' } } }
 *     responses:
 *       200:
 *         description: Sesión iniciada
 *         content: { application/json: { schema: { $ref: '#/components/schemas/LoginResponse' } } }
 *       401: { $ref: '#/components/responses/BadCredentials' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 *       429: { $ref: '#/components/responses/TooManyRequests' }
 */
router.post("/login", loginRateLimit, validate({ body: loginSchema }), login);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Usuario de la sesión, con su perfil
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Usuario de la sesión
 *         content: { application/json: { schema: { $ref: '#/components/schemas/MeResponse' } } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
router.get("/me", authenticate, getMe);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Cerrar sesión
 *     description: Apunta el token en la blacklist (`revoked_tokens`); a partir de ahí da 401 aunque no haya caducado.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       204: { description: Sesión cerrada }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
router.post("/logout", authenticate, logout);

export default router;
