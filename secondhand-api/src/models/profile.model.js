import mongoose from "mongoose";
import { IMAGE_KIND, IMAGE_OWNER } from "../constants/image.constants.js";
import { DELETED_FIELDS, baseFields, baseOptions } from "./base.fields.js";
import { softDeletePlugin } from "./plugins/softDelete.plugin.js";

/**
 * Profile — lo que la persona cuenta de sí misma: teléfono, ubicación, bio y avatar.
 *
 * Colección `profiles`. Es una parte del usuario, no una entidad propia: nace, se edita, se desactiva,
 * se borra y se restaura siempre con su usuario, a través de `user.service.js`.
 * Relaciones: 1 Profile → 1 User (userId, único) · 1 Profile → 1 Image de avatar.
 */
const profileSchema = new mongoose.Schema(
  {
    // ── Relaciones ──
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "El perfil necesita un usuario"],
      // Único: un perfil por usuario (el 1 a 1). Inmutable: no puede pasar a ser de otro usuario.
      unique: true,
      immutable: true,
    },

    // ── Datos del perfil ──
    phone: { type: String, trim: true, maxlength: [20, "El teléfono no puede superar 20 caracteres"] },
    location: { type: String, trim: true, maxlength: [100, "La ubicación no puede superar 100 caracteres"] },
    bio: { type: String, trim: true, maxlength: [300, "La bio no puede superar 300 caracteres"] },
    // El avatar no es un campo: es una Image (virtual `avatar`, abajo).

    // ── Comunes: isActive (+ deletedAt por el plugin; sin slug: se busca por su usuario) ──
    ...baseFields,
  },
  baseOptions
);

// ── Virtuales (populate) ──
/**
 * Avatar: la Image de tipo avatar cuyo dueño es este perfil. Al cambiarlo, el anterior pasa a soft delete,
 * así que el vivo es siempre uno. Al poblarlo hay que repetir el `match`: el de un populate sustituye al
 * del virtual.
 */
export const AVATAR_MATCH = Object.freeze({ ownerType: IMAGE_OWNER.PROFILE, kind: IMAGE_KIND.AVATAR });
profileSchema.virtual("avatar", { ref: "Image", localField: "_id", foreignField: "ownerId", justOne: true, match: AVATAR_MATCH });

// ── Plugins ──
profileSchema.plugin(softDeletePlugin, { deletedFields: DELETED_FIELDS });

export const Profile = mongoose.model("Profile", profileSchema);
