import mongoose from "mongoose";
import { uniqueSlug } from "../utils/slugify.js";
import { baseFields, baseOptions } from "./base.fields.js";

/** Nombres exactos de los modelos: refPath los usa para resolver la referencia. */
export const IMAGE_OWNER_TYPES = ["User", "Category", "Product", "ProductVariant"];
export const IMAGE_KINDS = ["avatar", "icon", "cover", "gallery"];

const imageSchema = new mongoose.Schema(
  {
    ownerType: { type: String, required: true, enum: IMAGE_OWNER_TYPES },
    ownerId: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: "ownerType" },
    kind: { type: String, required: true, enum: IMAGE_KINDS },
    slug: { type: String, required: true, unique: true },
    url: {
      type: String,
      required: [true, "La URL de la imagen es obligatoria"],
      trim: true,
      match: [/^https?:\/\/\S+$/i, "La URL de la imagen debe empezar por http:// o https://"],
    },
    storageKey: { type: String, trim: true },
    alt: { type: String, trim: true, maxlength: [120, "El texto alternativo no puede superar 120 caracteres"] },
    order: { type: Number, default: 0 },
    isPrimary: { type: Boolean, default: false },
    width: { type: Number, min: 1 },
    height: { type: Number, min: 1 },
    mimeType: { type: String, enum: ["image/jpeg", "image/png", "image/webp"] },
    size: { type: Number, max: [5 * 1024 * 1024, "La imagen no puede superar 5 MB"] },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    status: { type: String, enum: ["pending", "ready", "failed"], default: "pending" },
    ...baseFields,
  },
  baseOptions
);

imageSchema.index({ ownerType: 1, ownerId: 1, order: 1 });
imageSchema.index({ ownerType: 1, ownerId: 1, isPrimary: 1 });

imageSchema.pre("validate", async function () {
  if (!this.slug) this.slug = await uniqueSlug(this.constructor, this.alt || `${this.ownerType}-${this.kind}`, this._id);
});

export const Image = mongoose.model("Image", imageSchema);
