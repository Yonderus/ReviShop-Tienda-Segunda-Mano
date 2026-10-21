import mongoose from "mongoose";

/** Campos obligatorios en todas las entidades: visibilidad, soft delete y auditoría. */
export const baseFields = {
  isActive: { type: Boolean, default: true },
  deletedAt: { type: Date, default: null },
  // Queda en null mientras no exista login.
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
};

export const baseOptions = {
  timestamps: true,
  id: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
};
