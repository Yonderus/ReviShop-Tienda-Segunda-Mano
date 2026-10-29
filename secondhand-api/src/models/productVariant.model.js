import mongoose from "mongoose";
import { IMAGE_OWNER } from "../constants/image.constants.js";
import { SALE_STATUSES } from "../constants/product.constants.js";
import { buildOptionsKey } from "../utils/productVariant.utils.js";
import { DELETED_FIELDS, baseFields, baseOptions } from "./base.fields.js";
import { softDeletePlugin } from "./plugins/softDelete.plugin.js";

/** Una opción de la variante (p. ej. talla: M). `key` es un atributo de la categoría del producto. */
const optionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true, lowercase: true },
    value: { type: String, required: true, trim: true },
  },
  { _id: false }
);

/**
 * ProductVariant — una versión concreta de un producto (talla M, 128 GB…) con su precio, stock y estado.
 *
 * Colección `productvariants`. Sin opciones es la variante "única" (isDefault).
 * Relaciones: N ProductVariant → 1 Product · 1 ProductVariant → N Image.
 */
const productVariantSchema = new mongoose.Schema(
  {
    // ── Relaciones ──
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },

    // ── Identificadores ──
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
    // Sin slugPlugin: sale del slug del producto (variantSlugBase) y lo pone el service.
    slug: { type: String, required: true, unique: true },

    // ── Datos ──
    options: { type: [optionSchema], default: [] },
    // Las opciones en forma de texto ordenado: impide dos variantes iguales del mismo producto (índice único).
    optionsKey: { type: String, required: true },
    // null = usa el basePrice del producto.
    price: { type: Number, default: null, min: [0, "El precio no puede ser negativo"] },
    stock: { type: Number, default: 1, min: [0, "El stock no puede ser negativo"] },
    isDefault: { type: Boolean, default: false },
    order: { type: Number, default: 0 },

    // ── Estado ──
    status: { type: String, enum: SALE_STATUSES, default: "disponible" },

    // ── Comunes: isActive (+ deletedAt por el plugin; el slug va arriba) ──
    ...baseFields,
  },
  baseOptions
);

// ── Virtuales (populate) ──
productVariantSchema.virtual("images", {
  ref: "Image",
  localField: "_id",
  foreignField: "ownerId",
  match: { ownerType: IMAGE_OWNER.PRODUCT_VARIANT },
  options: { sort: { order: 1 } },
});

// ── Índices ──
productVariantSchema.index({ productId: 1, optionsKey: 1 }, { unique: true });
productVariantSchema.index({ productId: 1, order: 1 });

// ── Hooks ──
productVariantSchema.pre("validate", function () {
  if (this.isModified("options") || !this.optionsKey) this.optionsKey = buildOptionsKey(this.options);
});

// ── Plugins ──
productVariantSchema.plugin(softDeletePlugin, { deletedFields: DELETED_FIELDS });

export const ProductVariant = mongoose.model("ProductVariant", productVariantSchema);
