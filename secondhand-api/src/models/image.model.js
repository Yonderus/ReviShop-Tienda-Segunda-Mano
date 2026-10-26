import mongoose from "mongoose";
import { IMAGE_KINDS, IMAGE_OWNER_TYPES, IMAGE_STATUS, IMAGE_STATUSES } from "../constants/image.constants.js";
import { isHttpUrl } from "../utils/url.js";
import { DELETED_FIELDS, baseFields, baseOptions } from "./base.fields.js";
import { slugPlugin } from "./plugins/slug.plugin.js";
import { softDeletePlugin } from "./plugins/softDelete.plugin.js";

const imageSchema = new mongoose.Schema(
  {
    ownerType: { type: String, required: true, enum: IMAGE_OWNER_TYPES },
    ownerId: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: "ownerType" },
    kind: { type: String, required: true, enum: IMAGE_KINDS },
    url: {
      type: String,
      required: [true, "La URL de la imagen es obligatoria"],
      trim: true,
      validate: { validator: isHttpUrl, message: "La URL de la imagen debe ser una dirección http(s) válida" },
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
    status: { type: String, enum: IMAGE_STATUSES, default: IMAGE_STATUS.PENDING },
    ...baseFields,
  },
  baseOptions
);

imageSchema.index({ ownerType: 1, ownerId: 1, order: 1 });
imageSchema.index({ ownerType: 1, ownerId: 1, isPrimary: 1 });

imageSchema.plugin(slugPlugin, { source: (doc) => doc.alt || `${doc.ownerType}-${doc.kind}`, unique: true });
imageSchema.plugin(softDeletePlugin, { deletedFields: DELETED_FIELDS });

export const Image = mongoose.model("Image", imageSchema);
