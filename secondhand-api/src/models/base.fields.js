/**
 * Lo que comparten todos los modelos. Cada modelo tiene además, por sus plugins:
 *
 *   isActive               visibilidad (este archivo). Independiente del borrado: algo puede estar
 *                          inactivo sin estar eliminado.
 *   deletedAt · deletedBy  papelera (softDeletePlugin). null = no eliminado.
 *   slug                   identificador legible para las URL (slugPlugin), salvo Profile y ProductVariant.
 *   createdAt · updatedAt  fechas (timestamps de baseOptions).
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
