import mongoose from "mongoose";

/**
 * Campos comunes. `isActive` (visibilidad) es independiente del soft delete: un producto puede estar
 * inactivo sin estar eliminado. `deletedAt` y `deletedBy` siguen aquí mientras haya modelos sin el
 * plugin de soft delete; en los que lo usan, el plugin los vuelve a declarar igual.
 */
export const baseFields = {
  isActive: { type: Boolean, default: true },
  deletedAt: { type: Date, default: null },
  // Queda en null mientras no exista login.
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
};

/** Lo que el soft delete fija además de `deletedAt`: lo eliminado nunca queda visible. */
export const DELETED_FIELDS = Object.freeze({ isActive: false });

export const baseOptions = {
  timestamps: true,
  id: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
};
