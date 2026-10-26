import mongoose from "mongoose";
import { DELETED_FIELDS, baseFields, baseOptions } from "./base.fields.js";
import { softDeletePlugin } from "./plugins/softDelete.plugin.js";
import { IMAGE_OWNER } from "../constants/image.constants.js";
import { SALE_STATUSES } from "../constants/product.constants.js";
import { buildOptionsKey } from "../utils/productVariant.utils.js";

const optionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true, lowercase: true },
    value: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const productVariantSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
    // Sin slugPlugin: sale del slug del producto (variantSlugBase) y lo pone el service.
    slug: { type: String, required: true, unique: true },
    options: { type: [optionSchema], default: [] },
    optionsKey: { type: String, required: true },
    price: { type: Number, default: null, min: [0, "El precio no puede ser negativo"] },
    stock: { type: Number, default: 1, min: [0, "El stock no puede ser negativo"] },
    isDefault: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
    status: { type: String, enum: SALE_STATUSES, default: "disponible" },
    ...baseFields,
  },
  baseOptions
);

productVariantSchema.index({ productId: 1, optionsKey: 1 }, { unique: true });
productVariantSchema.index({ productId: 1, order: 1 });

productVariantSchema.virtual("images", {
  ref: "Image",
  localField: "_id",
  foreignField: "ownerId",
  match: { ownerType: IMAGE_OWNER.PRODUCT_VARIANT },
  options: { sort: { order: 1 } },
});

productVariantSchema.pre("validate", function () {
  if (this.isModified("options") || !this.optionsKey) this.optionsKey = buildOptionsKey(this.options);
});

productVariantSchema.plugin(softDeletePlugin, { deletedFields: DELETED_FIELDS });

export const ProductVariant = mongoose.model("ProductVariant", productVariantSchema);
