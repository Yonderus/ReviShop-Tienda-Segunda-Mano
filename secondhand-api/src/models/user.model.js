import mongoose from "mongoose";
import { USER_STATUS, USER_STATUSES } from "../constants/user.constants.js";
import { isEmail } from "../utils/email.js";
import { DELETED_FIELDS, baseFields, baseOptions } from "./base.fields.js";
import { slugPlugin } from "./plugins/slug.plugin.js";
import { softDeletePlugin } from "./plugins/softDelete.plugin.js";

const userSchema = new mongoose.Schema(
  {
    roleId: { type: mongoose.Schema.Types.ObjectId, ref: "Role", required: [true, "El rol es obligatorio"] },
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
    passwordHash: { type: String, required: true, select: false },
    phone: { type: String, trim: true },
    location: { type: String, trim: true },
    bio: { type: String, trim: true, maxlength: [300, "La bio no puede superar 300 caracteres"] },
    lastLoginAt: { type: Date, default: null },
    emailVerifiedAt: { type: Date, default: null },
    status: { type: String, enum: USER_STATUSES, default: USER_STATUS.PENDING },
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

userSchema.virtual("role", { ref: "Role", localField: "roleId", foreignField: "_id", justOne: true });

// Dos personas pueden llamarse igual: el slug lleva sufijo (-2, -3…) en vez de dar error. Sigue al nombre.
userSchema.plugin(slugPlugin, { source: (doc) => doc.name, regenerateOn: ["name"], unique: true });
userSchema.plugin(softDeletePlugin, { deletedFields: DELETED_FIELDS });

export const User = mongoose.model("User", userSchema);
