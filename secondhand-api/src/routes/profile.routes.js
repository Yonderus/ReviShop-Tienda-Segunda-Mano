import { Router } from "express";
import { getMyProfile, updateMyProfile } from "../controllers/profile.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.js";
import { updateProfileSchema } from "../validators/profile.validator.js";

/** Solo "mi" perfil: no hay rutas para crear, borrar ni ver el de otro (el admin lo hace desde /users). */
const router = Router();

/**
 * @openapi
 * /profile/me:
 *   get:
 *     tags: [Perfil]
 *     summary: Mi perfil
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Teléfono, ubicación, bio y avatar (solo los que tenga)
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ProfileResponse' } } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
router.get("/me", authenticate, getMyProfile);

/**
 * @openapi
 * /profile/me:
 *   patch:
 *     tags: [Perfil]
 *     summary: Editar mi perfil
 *     description: Solo teléfono, ubicación, bio y avatar. Nunca el rol, el estado ni el perfil de otro (un userId en el body se ignora).
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content: { application/json: { schema: { $ref: '#/components/schemas/ProfileInput' } } }
 *     responses:
 *       200:
 *         description: Perfil actualizado
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ProfileResponse' } } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.patch("/me", authenticate, validate({ body: updateProfileSchema }), updateMyProfile);

export default router;
