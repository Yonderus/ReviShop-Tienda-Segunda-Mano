import mongoose from "mongoose";
import { IMAGE_OWNER } from "../constants/image.constants.js";
import { PRODUCT_CONDITIONS, SALE_STATUSES } from "../constants/product.constants.js";
import { slugify } from "../utils/slugify.js";
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
    // La ubicación normalizada ("Valencia", "valencia" y "VALÈNCIA" → "valencia"): para filtrar y agrupar en
    // la tienda igual que categorías y vendedores, por slug. La calculan los hooks de abajo: el cliente no la
    // envía (no está en el validador), pero sí la recibe, para enlazar a `/shop?location=…`.
    locationSlug: { type: String, default: null },

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

// ── Campos derivados ──
const locationSlugOf = (location) => (location?.trim() ? slugify(location) : null);

// Al crear (y en cualquier save) y en los PATCH (findOneAndUpdate), como el slugPlugin con `regenerateOn`.
productSchema.pre("validate", function () {
  if (this.isNew || this.isModified("location")) this.locationSlug = locationSlugOf(this.location);
});
productSchema.pre("findOneAndUpdate", function () {
  const update = this.getUpdate() ?? {};
  const location = update.$set?.location ?? update.location;
  if (location !== undefined) this.set("locationSlug", locationSlugOf(location));
});

// ── Índices ──
// Todas las consultas de la tienda llevan `isActive: true` y `deletedAt: null` (el plugin de soft delete).
// Regla ESR: primero los campos de igualdad, después el de orden y al final el de rango. Así el índice filtra
// y además da el orden hecho (sin ordenar en memoria). El orden de la tienda desempata por `_id` (paginación
// estable), así que `_id` va al final: sin él, MongoDB tendría que acabar de ordenar en memoria.
// Comprobados con explain() (ver README, Tienda).
productSchema.index({ isActive: 1, deletedAt: 1, createdAt: -1, _id: -1 }); // sin filtros, por fecha (y el panel)
productSchema.index({ isActive: 1, deletedAt: 1, categoryId: 1, createdAt: -1, _id: -1 }); // por categoría
productSchema.index({ isActive: 1, deletedAt: 1, sellerId: 1, createdAt: -1, _id: -1 }); // por vendedor
productSchema.index({ isActive: 1, deletedAt: 1, locationSlug: 1, createdAt: -1, _id: -1 }); // por ubicación
productSchema.index({ isActive: 1, deletedAt: 1, basePrice: 1, _id: 1 }); // orden y rango de precio (también al revés)
// Sueltos, sin isActive: las comprobaciones de integridad (¿tiene productos esta categoría o este usuario?).
productSchema.index({ categoryId: 1 });
productSchema.index({ sellerId: 1 });
// Búsqueda. Solo puede haber uno de texto por colección; el título pesa más que la descripción.
productSchema.index(
  { title: "text", description: "text" },
  { default_language: "spanish", weights: { title: 3, description: 1 }, name: "product_text_search" },
);

// ── Plugins ──
// Sin sufijo: un título repetido es un 409 (el service lo comprueba antes para dar un mensaje claro).
productSchema.plugin(slugPlugin, { source: (doc) => doc.title, regenerateOn: ["title"] });
productSchema.plugin(softDeletePlugin, { deletedFields: DELETED_FIELDS });

export const Product = mongoose.model("Product", productSchema);
