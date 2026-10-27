import mongoose from "mongoose";
import { PERMISSIONS, ROLE_STATUS, ROLE_STATUSES } from "../constants/role.constants.js";
import { DELETED_FIELDS, baseFields, baseOptions } from "./base.fields.js";
import { slugPlugin } from "./plugins/slug.plugin.js";
import { softDeletePlugin } from "./plugins/softDelete.plugin.js";

const roleSchema = new mongoose.Schema(
  {
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
    isSystem: { type: Boolean, default: false },
    status: { type: String, enum: ROLE_STATUSES, default: ROLE_STATUS.ACTIVE },
    ...baseFields,
  },
  baseOptions
);

roleSchema.plugin(slugPlugin, { source: (doc) => doc.name });
roleSchema.plugin(softDeletePlugin, { deletedFields: DELETED_FIELDS });

export const Role = mongoose.model("Role", roleSchema);
