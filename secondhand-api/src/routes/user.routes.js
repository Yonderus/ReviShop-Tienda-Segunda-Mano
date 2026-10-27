import { Router } from "express";
import {
  createUser,
  getActiveUsers,
  getInactiveUsers,
  getSellers,
  getTrashedUsers,
  getUserById,
  getUserBySlug,
  getUsers,
  restoreUser,
  setUserActive,
  softDeleteUser,
  updateUser,
} from "../controllers/user.controller.js";
import { validate } from "../middlewares/validate.js";
import { idParamsSchema, restoreSchema, setActiveSchema, slugParamsSchema } from "../validators/common.validator.js";
import { allUsersQuerySchema, createUserSchema, updateUserSchema, userListQuerySchema } from "../validators/user.validator.js";

/**
 * @openapi
 * /sellers:
 *   get:
 *     tags: [Usuarios]
 *     summary: Público — quién puede publicar
 *     description: Usuarios activos y no suspendidos (en Revishop cualquier usuario compra y vende). Solo campos públicos.
 *     responses:
 *       200:
 *         description: Vendedores
 *         content: { application/json: { schema: { $ref: '#/components/schemas/SellerListResponse' } } }
 */
export const sellerRoutes = Router().get("/", getSellers);

const router = Router();

/**
 * @openapi
 * /users:
 *   get:
 *     tags: [Usuarios]
 *     summary: Panel — todos los no eliminados
 *     parameters:
 *       - { name: isActive, in: query, schema: { type: string, enum: ['true', 'false'] } }
 *       - $ref: '#/components/parameters/UserStatus'
 *       - $ref: '#/components/parameters/UserRole'
 *     responses:
 *       200:
 *         description: Con su rol y su nº de productos
 *         content: { application/json: { schema: { $ref: '#/components/schemas/UserListResponse' } } }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get("/", validate({ query: allUsersQuerySchema }), getUsers);

/**
 * @openapi
 * /users/actives:
 *   get:
 *     tags: [Usuarios]
 *     summary: Panel — activos
 *     parameters: [{ $ref: '#/components/parameters/UserStatus' }, { $ref: '#/components/parameters/UserRole' }]
 *     responses:
 *       200:
 *         description: Con su rol y su nº de productos
 *         content: { application/json: { schema: { $ref: '#/components/schemas/UserListResponse' } } }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get("/actives", validate({ query: userListQuerySchema }), getActiveUsers);

/**
 * @openapi
 * /users/inactives:
 *   get:
 *     tags: [Usuarios]
 *     summary: Panel — inactivos (no pueden vender)
 *     parameters: [{ $ref: '#/components/parameters/UserStatus' }, { $ref: '#/components/parameters/UserRole' }]
 *     responses:
 *       200:
 *         description: Con su rol y su nº de productos
 *         content: { application/json: { schema: { $ref: '#/components/schemas/UserListResponse' } } }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get("/inactives", validate({ query: userListQuerySchema }), getInactiveUsers);

/**
 * @openapi
 * /users/trash:
 *   get:
 *     tags: [Usuarios]
 *     summary: Panel — papelera, del eliminado más reciente al más antiguo
 *     parameters: [{ $ref: '#/components/parameters/UserStatus' }, { $ref: '#/components/parameters/UserRole' }]
 *     responses:
 *       200:
 *         description: Usuarios eliminados
 *         content: { application/json: { schema: { $ref: '#/components/schemas/UserListResponse' } } }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get("/trash", validate({ query: userListQuerySchema }), getTrashedUsers);

/**
 * @openapi
 * /users/slug/{slug}:
 *   get:
 *     tags: [Usuarios]
 *     summary: Detalle por slug
 *     parameters: [{ name: slug, in: path, required: true, schema: { type: string, example: lucia-martin } }]
 *     responses:
 *       200:
 *         description: Usuario con su rol y su nº de productos
 *         content: { application/json: { schema: { $ref: '#/components/schemas/UserResponse' } } }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.get("/slug/:slug", validate({ params: slugParamsSchema }), getUserBySlug);

/**
 * @openapi
 * /users/{id}:
 *   get:
 *     tags: [Usuarios]
 *     summary: Detalle por id
 *     parameters: [{ $ref: '#/components/parameters/UserId' }]
 *     responses:
 *       200:
 *         description: Usuario con su rol y su nº de productos
 *         content: { application/json: { schema: { $ref: '#/components/schemas/UserResponse' } } }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get("/:id", validate({ params: idParamsSchema }), getUserById);

/**
 * @openapi
 * /users:
 *   post:
 *     tags: [Usuarios]
 *     summary: Crear un usuario
 *     description: La contraseña se guarda con hash bcrypt y no sale nunca en las respuestas. Nace en estado pending salvo que se envíe otro.
 *     requestBody:
 *       required: true
 *       content: { application/json: { schema: { $ref: '#/components/schemas/UserInput' } } }
 *     responses:
 *       201:
 *         description: Creado
 *         content: { application/json: { schema: { $ref: '#/components/schemas/UserResponse' } } }
 *       409: { $ref: '#/components/responses/Conflict' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.post("/", validate({ body: createUserSchema }), createUser);

/**
 * @openapi
 * /users/{id}:
 *   patch:
 *     tags: [Usuarios]
 *     summary: Actualización parcial
 *     description: password es opcional; si llega, se cambia. Al último administrador activo no se le puede cambiar el rol ni suspender (409).
 *     parameters: [{ $ref: '#/components/parameters/UserId' }]
 *     requestBody:
 *       required: true
 *       content: { application/json: { schema: { $ref: '#/components/schemas/UserInput' } } }
 *     responses:
 *       200:
 *         description: Actualizado
 *         content: { application/json: { schema: { $ref: '#/components/schemas/UserResponse' } } }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/Conflict' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.patch("/:id", validate({ params: idParamsSchema, body: updateUserSchema }), updateUser);

/**
 * @openapi
 * /users/{id}/active:
 *   patch:
 *     tags: [Usuarios]
 *     summary: Activar o desactivar
 *     description: Un usuario inactivo no puede vender. Al último administrador activo no se le puede desactivar (409).
 *     parameters: [{ $ref: '#/components/parameters/UserId' }]
 *     requestBody:
 *       required: true
 *       content: { application/json: { schema: { $ref: '#/components/schemas/ActiveInput' } } }
 *     responses:
 *       200:
 *         description: Visibilidad cambiada
 *         content: { application/json: { schema: { $ref: '#/components/schemas/UserResponse' } } }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/Conflict' }
 */
router.patch("/:id/active", validate({ params: idParamsSchema, body: setActiveSchema }), setUserActive);

/**
 * @openapi
 * /users/{id}/restore:
 *   patch:
 *     tags: [Usuarios]
 *     summary: Restaurar desde la papelera
 *     description: Vuelve inactivo salvo isActive true, con su avatar.
 *     parameters: [{ $ref: '#/components/parameters/UserId' }]
 *     requestBody:
 *       content: { application/json: { schema: { $ref: '#/components/schemas/RestoreInput' } } }
 *     responses:
 *       200:
 *         description: Restaurado
 *         content: { application/json: { schema: { $ref: '#/components/schemas/UserResponse' } } }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/Conflict' }
 */
router.patch("/:id/restore", validate({ params: idParamsSchema, body: restoreSchema }), restoreUser);

/**
 * @openapi
 * /users/{id}:
 *   delete:
 *     tags: [Usuarios]
 *     summary: Mover a la papelera (soft delete)
 *     description: 409 si tiene productos o si es el último administrador activo.
 *     parameters: [{ $ref: '#/components/parameters/UserId' }]
 *     responses:
 *       204: { description: Eliminado }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/Conflict' }
 */
router.delete("/:id", validate({ params: idParamsSchema }), softDeleteUser);

export default router;
