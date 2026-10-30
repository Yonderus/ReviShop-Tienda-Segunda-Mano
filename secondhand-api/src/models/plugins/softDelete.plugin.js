import mongoose from "mongoose";

/**
 * Consultas en las que se ocultan los eliminados. Los borrados físicos (deleteOne/deleteMany)
 * no se filtran a propósito: el seed vacía las colecciones enteras.
 */
const FILTERED_QUERIES = ["find", "findOne", "findOneAndUpdate", "countDocuments", "distinct", "updateOne", "updateMany"];

/**
 * Soft delete reutilizable por cualquier modelo.
 *
 * - Añade `deletedAt` (null = no eliminado) y `deletedBy`.
 * - Oculta los eliminados en todas las consultas, populate incluidos, salvo que:
 *     · el filtro ya hable de `deletedAt` (la papelera: `{ deletedAt: { $ne: null } }`), o
 *     · se pida expresamente con `.setOptions({ withDeleted: true })`.
 * - `Model.softDeleteMany(filter, date, deletedBy)` y `Model.restoreMany(filter, date, fields)`: la fecha
 *   enlaza un borrado en cascada con su restauración, así solo vuelve lo que se borró junto. `deletedBy` es
 *   quién lo mandó a la papelera (el usuario de la sesión; null si fue el sistema, p. ej. el seed).
 *   Restaurar lo vacía.
 *
 * @param {object} [options.deletedFields] campos que se fijan además de deletedAt (p. ej. isActive: false)
 */
export function softDeletePlugin(schema, { deletedFields = {} } = {}) {
  schema.add({
    deletedAt: { type: Date, default: null },
    // Quién lo mandó a la papelera. null: no está eliminado, o lo eliminó el sistema (el seed).
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  });

  schema.pre(FILTERED_QUERIES, function () {
    if (this.getOptions().withDeleted) return;
    if (this.getFilter().deletedAt === undefined) this.where({ deletedAt: null });
  });

  schema.statics.softDeleteMany = function (filter, date = new Date(), deletedBy = null) {
    return this.updateMany({ ...filter, deletedAt: null }, { ...deletedFields, deletedAt: date, deletedBy });
  };

  schema.statics.restoreMany = function (filter, date, fields = {}) {
    return this.updateMany({ ...filter, deletedAt: date }, { ...fields, deletedAt: null, deletedBy: null });
  };
}
