import mongoose from "mongoose";
import { USER_STATUS, USER_STATUSES } from "../constants/user.constants.js";
import { uniqueSlug } from "../utils/slugify.js";
import { baseFields, baseOptions } from "./base.fields.js";

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
    slug: { type: String, required: true, unique: true },
    email: {
      type: String,
      required: [true, "El email es obligatorio"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "El email no es válido"],
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

userSchema.pre("validate", async function () {
  if (!this.slug && this.name) this.slug = await uniqueSlug(this.constructor, this.name, this._id);
});

export const User = mongoose.model("User", userSchema);
