import mongoose from "mongoose";
import { IMAGE_KINDS, IMAGE_OWNER_TYPES, IMAGE_STATUS, IMAGE_STATUSES } from "../constants/image.constants.js";
import { isHttpUrl } from "../utils/url.js";
import { DELETED_FIELDS, baseFields, baseOptions } from "./base.fields.js";
import { slugPlugin } from "./plugins/slug.plugin.js";
import { softDeletePlugin } from "./plugins/softDelete.plugin.js";

/**
 * Image — una imagen de cualquier dueño (polimórfica): avatar de un perfil, icono de una categoría, o
 * portada y galería de un producto o de una variante.
 *
 * Colección `images`. Al sustituir las de un dueño, las anteriores pasan a soft delete.
 * Relaciones: N Image → 1 dueño (ownerType + ownerId) · N Image → 1 User (uploadedBy).
 */
const imageSchema = new mongoose.Schema(
  {
    // ── Relaciones ──
    // `refPath`: el modelo del dueño es el que diga ownerType (Profile, Category, Product, ProductVariant).
    ownerType: { type: String, required: true, enum: IMAGE_OWNER_TYPES },
    ownerId: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: "ownerType" },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    // ── Datos ──
    kind: { type: String, required: true, enum: IMAGE_KINDS },
    url: {
      type: String,
      required: [true, "La URL de la imagen es obligatoria"],
      trim: true,
      validate: { validator: isHttpUrl, message: "La URL de la imagen debe ser una dirección http(s) válida" },
    },
    alt: { type: String, trim: true, maxlength: [120, "El texto alternativo no puede superar 120 caracteres"] },
    // La primera es la portada.
    order: { type: Number, default: 0 },
    isPrimary: { type: Boolean, default: false },

    // ── Archivo (para cuando haya subida de archivos) ──
    storageKey: { type: String, trim: true },
    width: { type: Number, min: 1 },
    height: { type: Number, min: 1 },
    mimeType: { type: String, enum: ["image/jpeg", "image/png", "image/webp"] },
    size: { type: Number, max: [5 * 1024 * 1024, "La imagen no puede superar 5 MB"] },

    // ── Estado ──
    status: { type: String, enum: IMAGE_STATUSES, default: IMAGE_STATUS.PENDING },

    // ── Comunes: isActive (+ deletedAt y slug por los plugins) ──
    ...baseFields,
  },
  baseOptions
);

// ── Índices ──
imageSchema.index({ ownerType: 1, ownerId: 1, order: 1 });
imageSchema.index({ ownerType: 1, ownerId: 1, isPrimary: 1 });

// ── Plugins ──
imageSchema.plugin(slugPlugin, { source: (doc) => doc.alt || `${doc.ownerType}-${doc.kind}`, unique: true });
imageSchema.plugin(softDeletePlugin, { deletedFields: DELETED_FIELDS });

export const Image = mongoose.model("Image", imageSchema);
