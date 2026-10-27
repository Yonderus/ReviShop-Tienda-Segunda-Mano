import { CATEGORY_STATUS } from "../constants/category.constants.js";
import { Category } from "../models/category.model.js";

// Los eliminados ya los oculta el plugin de soft delete.
const ACTIVE = { isActive: true };

export const categoryRepository = {
  findPublishedById(id) {
    return Category.findOne({ _id: id, ...ACTIVE, status: CATEGORY_STATUS.PUBLISHED }).lean();
  },

  /** Solo atributos y padre, incluyendo eliminadas: un producto puede seguir en una categoría ya borrada. */
  findAttributesById(id) {
    return Category.findById(id).setOptions({ withDeleted: true }).select("attributes parentId").lean();
  },

  findBySlug(slug) {
    return Category.findOne({ slug }).lean();
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
};
