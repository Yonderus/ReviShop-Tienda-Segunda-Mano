import mongoose from "mongoose";
import { PERMISSIONS } from "../constants/permissions.js";
import { slugify } from "../utils/slugify.js";
import { baseFields, baseOptions } from "./base.fields.js";

const roleSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "El nombre del rol es obligatorio"], trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
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
    status: { type: String, enum: ["active", "deprecated"], default: "active" },
    ...baseFields,
  },
  baseOptions
);

roleSchema.pre("validate", function () {
  if (!this.slug && this.name) this.slug = slugify(this.name);
});

export const Role = mongoose.model("Role", roleSchema);
