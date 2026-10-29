import mongoose from "mongoose";
import { PERMISSIONS, ROLE_STATUS, ROLE_STATUSES } from "../constants/role.constants.js";
import { DELETED_FIELDS, baseFields, baseOptions } from "./base.fields.js";
import { slugPlugin } from "./plugins/slug.plugin.js";
import { softDeletePlugin } from "./plugins/softDelete.plugin.js";

/**
 * Role — qué puede hacer un usuario (admin, moderator, user).
 *
 * Colección `roles`. Los crea el seed; no hay CRUD de roles.
 * Relaciones: 1 Role → N User (User.roleId).
 */
const roleSchema = new mongoose.Schema(
  {
    // ── Datos ──
    name: { type: String, required: [true, "El nombre del rol es obligatorio"], trim: true },
    description: { type: String, trim: true },
    permissions: {
      type: [String],
      required: true,
      validate: {
        validator: (list) => list.every((p) => PERMISSIONS.includes(p)),
        message: "El rol contiene permisos no válidos",
      },
    },

    // ── Estado ──
    isSystem: { type: Boolean, default: false },
    // Un rol `deprecated` se conserva para quien ya lo tiene, pero no se puede asignar.
    status: { type: String, enum: ROLE_STATUSES, default: ROLE_STATUS.ACTIVE },

    // ── Comunes: isActive (+ deletedAt y slug por los plugins) ──
    ...baseFields,
  },
  baseOptions
);

// ── Plugins ──
roleSchema.plugin(slugPlugin, { source: (doc) => doc.name });
roleSchema.plugin(softDeletePlugin, { deletedFields: DELETED_FIELDS });

export const Role = mongoose.model("Role", roleSchema);
