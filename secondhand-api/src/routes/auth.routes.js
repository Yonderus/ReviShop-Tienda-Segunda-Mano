import { Router } from "express";
import { getMe, login, logout, logoutAll, refresh } from "../controllers/auth.controller.js";
import { authenticate, optionalAuthenticate } from "../middlewares/auth.middleware.js";
import { loginRateLimit, refreshRateLimit } from "../middlewares/rateLimit.middleware.js";
import { validate } from "../middlewares/validate.js";
import { loginSchema } from "../validators/auth.validator.js";

const router = Router();

/*
 * Dos tokens, los dos en cookies `HttpOnly` y `SameSite=Strict`:
 * - access  → `revishop_session` (JWT corto, `Path=/api`): va en cada petición;
 * - refresh → `revishop_refresh` (opaco, 7 días, `Path=/api/auth`): solo llega a /auth/refresh y /auth/logout.
 * /auth/refresh es un POST: lo protegen `checkOrigin` (server.js) y `SameSite=Strict`, como cualquier escritura.
 */

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Iniciar sesión
 *     security: []
 *     description: |
 *       Pone **dos cookies**: el access token en `revishop_session` (`HttpOnly`, `SameSite=Strict`, `Path=/api`, dura
 *       `JWT_ACCESS_EXPIRES_IN`) y el refresh token en `revishop_refresh` (`HttpOnly`, `SameSite=Strict`,
 *       `Path=/api/auth`, 7 días). Devuelve el usuario y `accessExpiresAt`. Los tokens nunca van en el cuerpo.
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
 *             description: |
 *               `revishop_session=<JWT>; Max-Age=…; Path=/api; HttpOnly; SameSite=Strict` y
 *               `revishop_refresh=<token>; Max-Age=…; Path=/api/auth; HttpOnly; SameSite=Strict` (y `Secure` en producción)
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
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Renovar la sesión (access token nuevo)
 *     security: [{ refreshCookie: [] }]
 *     description: |
 *       Cambia el refresh token de la cookie `revishop_refresh` por otro nuevo (**rotación**: cada refresh sirve una
 *       sola vez) y pone un access token nuevo, con el rol actual del usuario. Devuelve lo mismo que el login.
 *
 *       - **401**: sin refresh, inválido, caducado, revocado, cuenta que ya no puede entrar, o **reutilizado**: si
 *         llega uno ya usado (fuera del margen), hay dos copias y se revoca toda la sesión. Borra las dos cookies.
 *       - **409**: ese refresh se acaba de renovar hace menos de `REFRESH_REUSE_GRACE_SECONDS` (dos pestañas a la
 *         vez). No borra nada: el navegador ya tiene las cookies nuevas; basta con reintentar la petición.
 *       - **429**: más de 60 renovaciones en 15 minutos desde la misma IP.
 *     responses:
 *       200:
 *         description: Sesión renovada
 *         headers:
 *           Set-Cookie: { description: "Las dos cookies, nuevas", schema: { type: string } }
 *         content: { application/json: { schema: { $ref: '#/components/schemas/LoginResponse' } } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       409: { $ref: '#/components/responses/Conflict' }
 *       429: { $ref: '#/components/responses/TooManyRequests' }
 */
router.post("/refresh", refreshRateLimit, refresh);

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
 *     summary: Cerrar sesión (en este navegador)
 *     description: |
 *       Si el access es válido, lo apunta en la blacklist (`revoked_tokens`). Si llega el refresh, revoca **toda** su
 *       sesión. **Siempre** borra las dos cookies, aunque los tokens ya no valgan o no haya sesión.
 *     security: [{ cookieAuth: [] }, { refreshCookie: [] }]
 *     responses:
 *       204:
 *         description: Sesión cerrada y cookies borradas
 *         headers:
 *           Set-Cookie: { description: "Borra `revishop_session` y `revishop_refresh`", schema: { type: string } }
 */
router.post("/logout", optionalAuthenticate, logout);

/**
 * @openapi
 * /auth/logout-all:
 *   post:
 *     tags: [Auth]
 *     summary: Cerrar sesión en todos los dispositivos
 *     description: |
 *       Revoca todas las sesiones de refresh del usuario y deja sin valor, al momento, los access tokens que tengan sus
 *       otros navegadores (`tokensValidAfter`). Borra las dos cookies de este.
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       204:
 *         description: Todas las sesiones cerradas
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
router.post("/logout-all", authenticate, logoutAll);

export default router;
