import { z } from "zod";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, USER_STATUSES } from "../constants/user.constants.js";
import { isEmail } from "../utils/email.js";
import { objectId } from "./common.validator.js";

const status = z.enum(USER_STATUSES, { error: `status debe ser: ${USER_STATUSES.join(", ")}` });

export const createUserSchema = z.object({
  name: z
    .string({ error: "El nombre es obligatorio" })
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(60, "El nombre no puede superar 60 caracteres"),
  email: z
    .string({ error: "El email es obligatorio" })
    .trim()
    .toLowerCase()
    .max(120, "El email no puede superar 120 caracteres")
    .refine(isEmail, "El email no es válido"),
  password: z
    .string({ error: "La contraseña es obligatoria" })
    .min(PASSWORD_MIN_LENGTH, `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`)
    .max(PASSWORD_MAX_LENGTH, `La contraseña no puede superar ${PASSWORD_MAX_LENGTH} caracteres`),
  roleId: objectId("roleId"),
  // Vacío = sin teléfono (así se puede borrar en un PATCH).
  phone: z
    .string()
    .trim()
    .max(20, "El teléfono no puede superar 20 caracteres")
    .regex(/^[\d\s+()-]*$/, "El teléfono solo puede tener números, espacios y + ( ) -")
    .optional(),
  location: z.string().trim().max(100, "La ubicación no puede superar 100 caracteres").optional(),
  bio: z.string().trim().max(300, "La bio no puede superar 300 caracteres").optional(),
  status: status.optional(),
});

/** En un PATCH todo es opcional; si llega `password`, se cambia. */
export const updateUserSchema = createUserSchema.partial();

/** Listados del panel: por estado de la cuenta y por rol (slug). */
export const userListQuerySchema = z.object({
  status: status.optional(),
  role: z.string().trim().min(1).optional(),
});

/** GET /users: todos los no eliminados, o solo activos / inactivos. */
export const allUsersQuerySchema = userListQuerySchema.extend({
  isActive: z.enum(["true", "false"], { error: "isActive debe ser true o false" }).optional(),
});
