import mongoose from "mongoose";
import { IMAGE_OWNER } from "../constants/image.constants.js";
import { PRODUCT_CONDITIONS, SALE_STATUSES } from "../constants/product.constants.js";
import { DELETED_FIELDS, baseFields, baseOptions } from "./base.fields.js";
import { slugPlugin } from "./plugins/slug.plugin.js";
import { softDeletePlugin } from "./plugins/softDelete.plugin.js";

/**
 * Product — un anuncio de segunda mano.
 *
 * Colección `products`. Siempre tiene al menos una variante (la "única" si no tiene opciones).
 * Relaciones: N Product → 1 User (sellerId) · N Product → 1 Category · 1 Product → N ProductVariant ·
 * 1 Product → N Image.
 */
const productSchema = new mongoose.Schema(
  {
    // ── Relaciones ──
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: [true, "El vendedor es obligatorio"] },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: [true, "La categoría es obligatoria"] },

    // ── Datos ──
    title: { type: String, required: [true, "El título es obligatorio"], trim: true },
    description: { type: String, required: [true, "La descripción es obligatoria"], trim: true },
    condition: { type: String, required: true, enum: PRODUCT_CONDITIONS },
    basePrice: { type: Number, required: [true, "El precio base es obligatorio"], min: [0, "El precio no puede ser negativo"] },
    location: { type: String, trim: true },

    // ── Estado y contadores (los calcula el service) ──
    // A partir de las variantes (productService.recalculateStatus).
    status: { type: String, enum: SALE_STATUSES, default: "disponible" },
    variantsCount: { type: Number, default: 1, min: 0 },
    viewsCount: { type: Number, default: 0, min: 0 },

    // ── Comunes: isActive (+ deletedAt y slug por los plugins) ──
    ...baseFields,
  },
  baseOptions
);

// ── Virtuales (populate) ──
productSchema.virtual("seller", { ref: "User", localField: "sellerId", foreignField: "_id", justOne: true });
productSchema.virtual("category", { ref: "Category", localField: "categoryId", foreignField: "_id", justOne: true });
productSchema.virtual("variants", {
  ref: "ProductVariant",
  localField: "_id",
  foreignField: "productId",
  options: { sort: { order: 1 } },
});
productSchema.virtual("images", {
  ref: "Image",
  localField: "_id",
  foreignField: "ownerId",
  match: { ownerType: IMAGE_OWNER.PRODUCT },
  options: { sort: { order: 1 } },
});

// ── Índices ──
productSchema.index({ deletedAt: 1, isActive: 1, createdAt: -1 });
productSchema.index({ categoryId: 1 });
productSchema.index({ sellerId: 1 });
productSchema.index({ title: "text", description: "text" }, { default_language: "spanish" });

// ── Plugins ──
// Sin sufijo: un título repetido es un 409 (el service lo comprueba antes para dar un mensaje claro).
productSchema.plugin(slugPlugin, { source: (doc) => doc.title, regenerateOn: ["title"] });
productSchema.plugin(softDeletePlugin, { deletedFields: DELETED_FIELDS });

export const Product = mongoose.model("Product", productSchema);
