import mongoose from "mongoose";
import { slugify } from "../utils/slugify.js";
import { baseFields, baseOptions } from "./base.fields.js";

export const PRODUCT_CONDITIONS = ["nuevo", "como_nuevo", "bueno", "aceptable", "mejorable"];
export const SALE_STATUSES = ["disponible", "reservado", "vendido"];

const productSchema = new mongoose.Schema(
  {
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: [true, "El vendedor es obligatorio"] },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: [true, "La categoría es obligatoria"] },
    title: { type: String, required: [true, "El título es obligatorio"], trim: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, required: [true, "La descripción es obligatoria"], trim: true },
    condition: { type: String, required: true, enum: PRODUCT_CONDITIONS },
    basePrice: { type: Number, required: [true, "El precio base es obligatorio"], min: [0, "El precio no puede ser negativo"] },
    location: { type: String, trim: true },
    variantsCount: { type: Number, default: 1, min: 0 },
    viewsCount: { type: Number, default: 0, min: 0 },
    // Calculado a partir de las variantes (productService.recalculateStatus).
    status: { type: String, enum: SALE_STATUSES, default: "disponible" },
    ...baseFields,
  },
  baseOptions
);

productSchema.index({ deletedAt: 1, isActive: 1, createdAt: -1 });
productSchema.index({ categoryId: 1 });
productSchema.index({ sellerId: 1 });
productSchema.index({ title: "text", description: "text" }, { default_language: "spanish" });

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
  match: { ownerType: "Product", deletedAt: null },
  options: { sort: { order: 1 } },
});

productSchema.pre("validate", function () {
  if (this.isModified("title")) this.slug = slugify(this.title);
});

export const Product = mongoose.model("Product", productSchema);
