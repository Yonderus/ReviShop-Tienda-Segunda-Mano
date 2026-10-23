/**
 * Visibilidad. Es independiente del soft delete: un producto puede estar inactivo sin estar
 * eliminado. `deletedAt` y `deletedBy` los añade el plugin de soft delete.
 */
export const baseFields = {
  isActive: { type: Boolean, default: true },
};

/** Lo que el soft delete fija además de `deletedAt`: lo eliminado nunca queda visible. */
export const DELETED_FIELDS = Object.freeze({ isActive: false });

export const baseOptions = {
  timestamps: true,
  id: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
};
