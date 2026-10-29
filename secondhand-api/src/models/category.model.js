import mongoose from "mongoose";
import { CATEGORY_STATUS, CATEGORY_STATUSES } from "../constants/category.constants.js";
import { DELETED_FIELDS, baseFields, baseOptions } from "./base.fields.js";
import { slugPlugin } from "./plugins/slug.plugin.js";
import { softDeletePlugin } from "./plugins/softDelete.plugin.js";

/** Atributo de variante (p. ej. talla): sus productos solo pueden tener variantes con estas opciones. */
const attributeSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true, lowercase: true },
    label: { type: String, required: true, trim: true },
    values: { type: [String], default: [] },
  },
  { _id: false }
);

/**
 * Category — árbol de dos niveles (principales y subcategorías) con sus atributos de variante.
 *
 * Colección `categories`. Las subcategorías sin atributos propios heredan los de su padre.
 * Relaciones: N Category → 1 Category (parentId) · 1 Category → N Product.
 */
const categorySchema = new mongoose.Schema(
  {
    // ── Relaciones ──
    // null = categoría principal. Como mucho dos niveles (lo comprueba el service).
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null },

    // ── Datos ──
    name: { type: String, required: [true, "El nombre de la categoría es obligatorio"], trim: true },
    description: { type: String, trim: true },
    attributes: { type: [attributeSchema], default: [] },
    order: { type: Number, default: 0 },

    // ── Estado ──
    // Solo las publicadas salen en la tienda y admiten productos.
    status: { type: String, enum: CATEGORY_STATUSES, default: CATEGORY_STATUS.DRAFT },

    // ── Comunes: isActive (+ deletedAt y slug por los plugins) ──
    ...baseFields,
  },
  baseOptions
);

// ── Índices ──
categorySchema.index({ parentId: 1, order: 1 });

// ── Plugins ──
categorySchema.plugin(slugPlugin, { source: (doc) => doc.name, regenerateOn: ["name"] });
categorySchema.plugin(softDeletePlugin, { deletedFields: DELETED_FIELDS });

export const Category = mongoose.model("Category", categorySchema);
