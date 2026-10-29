import mongoose from "mongoose";
import { USER_STATUS, USER_STATUSES } from "../constants/user.constants.js";
import { isEmail } from "../utils/email.js";
import { DELETED_FIELDS, baseFields, baseOptions } from "./base.fields.js";
import { slugPlugin } from "./plugins/slug.plugin.js";
import { softDeletePlugin } from "./plugins/softDelete.plugin.js";

/**
 * User — la cuenta: quién eres y qué puedes hacer. Cualquiera compra y vende.
 *
 * Colección `users`. Lo personal (teléfono, ubicación, bio, avatar) está en su Profile.
 * Relaciones: N User → 1 Role · 1 User → 1 Profile · 1 User → N Product (como vendedor).
 */
const userSchema = new mongoose.Schema(
  {
    // ── Relaciones ──
    roleId: { type: mongoose.Schema.Types.ObjectId, ref: "Role", required: [true, "El rol es obligatorio"] },

    // ── Datos de la cuenta ──
    name: {
      type: String,
      required: [true, "El nombre es obligatorio"],
      trim: true,
      minlength: [2, "El nombre debe tener al menos 2 caracteres"],
      maxlength: [60, "El nombre no puede superar 60 caracteres"],
    },
    email: {
      type: String,
      required: [true, "El email es obligatorio"],
      unique: true,
      lowercase: true,
      trim: true,
      validate: { validator: isEmail, message: "El email no es válido" },
    },
    // Nunca sale en las consultas (select: false) ni en las respuestas (toJSON).
    passwordHash: { type: String, required: true, select: false },

    // ── Estado ──
    status: { type: String, enum: USER_STATUSES, default: USER_STATUS.PENDING },
    lastLoginAt: { type: Date, default: null },
    emailVerifiedAt: { type: Date, default: null },

    // ── Comunes: isActive (+ deletedAt y slug por los plugins) ──
    ...baseFields,
  },
  {
    ...baseOptions,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete ret.passwordHash;
        return ret;
      },
    },
  }
);

// ── Virtuales (populate) ──
userSchema.virtual("role", { ref: "Role", localField: "roleId", foreignField: "_id", justOne: true });
// El perfil apunta al usuario (Profile.userId); el usuario no guarda nada del perfil.
userSchema.virtual("profile", { ref: "Profile", localField: "_id", foreignField: "userId", justOne: true });

// ── Índices ──
// Buscar usuarios por rol (¿alguien usa este rol?) sin recorrer toda la colección.
userSchema.index({ roleId: 1 });

// ── Plugins ──
// Dos personas pueden llamarse igual: el slug lleva sufijo (-2, -3…) en vez de dar error. Sigue al nombre.
userSchema.plugin(slugPlugin, { source: (doc) => doc.name, regenerateOn: ["name"], unique: true });
userSchema.plugin(softDeletePlugin, { deletedFields: DELETED_FIELDS });

export const User = mongoose.model("User", userSchema);
