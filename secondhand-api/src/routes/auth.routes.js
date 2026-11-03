import { Router } from "express";
import { getMe, login, logout } from "../controllers/auth.controller.js";
import { authenticate, optionalAuthenticate } from "../middlewares/auth.middleware.js";
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
 *       Guarda el JWT en la cookie `revishop_session` (`HttpOnly`, `SameSite=Strict`, `Path=/api`) y devuelve
 *       el usuario. El navegador envía la cookie solo en las demás peticiones: desde aquí, el resto de pruebas
 *       de Swagger ya van con sesión. El token nunca va en el cuerpo.
 *       Email inexistente o contraseña mala → 401 con el mismo mensaje. Cuenta inactiva, suspendida o
 *       eliminada → 403. Límite de intentos fallidos cada 15 minutos (10 por IP y email, 50 por IP) → 429.
 *     requestBody:
 *       required: true
 *       content: { application/json: { schema: { $ref: '#/components/schemas/LoginInput' } } }
 *     responses:
 *       200:
 *         description: Sesión iniciada
 *         headers:
 *           Set-Cookie:
 *             description: "`revishop_session=<JWT>; Max-Age=…; Path=/api; HttpOnly; SameSite=Strict` (y `Secure` en producción)"
 *             schema: { type: string }
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
 *     security: [{ cookieAuth: [] }]
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
 *     description: |
 *       Si la sesión es válida, apunta el token en la blacklist (`revoked_tokens`): a partir de ahí da 401
 *       aunque no haya caducado. **Siempre** borra la cookie, aunque el token ya no valga o no haya sesión.
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       204:
 *         description: Sesión cerrada y cookie borrada
 *         headers:
 *           Set-Cookie: { description: "Borra `revishop_session`", schema: { type: string } }
 */
router.post("/logout", optionalAuthenticate, logout);

export default router;
