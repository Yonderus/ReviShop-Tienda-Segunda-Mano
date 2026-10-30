import mongoose from "mongoose";
import { CATEGORY_STATUS } from "../constants/category.constants.js";
import { Category } from "../models/category.model.js";

// Los eliminados ya los oculta el plugin de soft delete.
const ACTIVE = { isActive: true };
const WITH_DELETED = { withDeleted: true };
const ADMIN_FIELDS = "-__v -deletedBy";

export const categoryRepository = {
  findPublishedById(id) {
    return Category.findOne({ _id: id, ...ACTIVE, status: CATEGORY_STATUS.PUBLISHED }).lean();
  },

  /** Solo atributos y padre, incluyendo eliminadas: un producto puede seguir en una categoría ya borrada. */
  findAttributesById(id) {
    return Category.findById(id).setOptions(WITH_DELETED).select("attributes parentId").lean();
  },

  findBySlug(slug) {
    return Category.findOne({ slug }).select(ADMIN_FIELDS).lean();
  },

  findById(id) {
    return Category.findById(id).select(ADMIN_FIELDS).lean();
  },

  /** Incluye eliminadas: el service decide qué hacer con ellas (409, restaurar…). */
  findRawById(id) {
    return Category.findById(id).setOptions(WITH_DELETED).lean();
  },

  /** Incluye eliminadas: su slug sigue ocupado en el índice único. */
  findRawBySlug(slug) {
    return Category.findOne({ slug }).setOptions(WITH_DELETED).lean();
  },

  findChildrenIds(parentId) {
    return Category.find({ parentId }).distinct("_id");
  },

  listPublished() {
    return Category.find({ ...ACTIVE, status: CATEGORY_STATUS.PUBLISHED })
      .sort({ parentId: 1, order: 1, name: 1 })
      .select("name slug description parentId attributes order")
      .lean();
  },

  /** Panel: con borradores. Ordenadas como en el árbol (orden y nombre). */
  findAll(filter = {}) {
    return Category.find(filter).sort({ order: 1, name: 1 }).select(ADMIN_FIELDS).lean();
  },

  findTrashed(filter = {}) {
    return Category.find({ ...filter, deletedAt: { $ne: null } }).sort({ deletedAt: -1 }).select(ADMIN_FIELDS).lean();
  },

  /** Subcategorías no eliminadas de cada categoría: { [id]: número }. */
  async countChildren(ids) {
    // aggregate no pasa por el plugin de soft delete: el filtro de eliminadas va a mano.
    const rows = await Category.aggregate([
      { $match: { parentId: { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) }, deletedAt: null } },
      { $group: { _id: "$parentId", count: { $sum: 1 } } },
    ]);
    return Object.fromEntries(rows.map((row) => [String(row._id), row.count]));
  },

  create(data) {
    return Category.create(data);
  },

  updateById(id, data) {
    return Category.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  },

  softDeleteById(id, date, deletedBy = null) {
    return Category.softDeleteMany({ _id: id }, date, deletedBy);
  },

  restoreById(id, date, isActive) {
    return Category.restoreMany({ _id: id }, date, { isActive });
  },
};
