import { CATEGORY_STATUS } from "../constants/category.constants.js";
import { Category } from "../models/category.model.js";

const LIVE = { isActive: true, deletedAt: null };

export const categoryRepository = {
  findPublishedById(id) {
    return Category.findOne({ _id: id, ...LIVE, status: CATEGORY_STATUS.PUBLISHED }).lean();
  },

  findBySlug(slug) {
    return Category.findOne({ slug, deletedAt: null }).lean();
  },

  findChildrenIds(parentId) {
    return Category.find({ parentId, deletedAt: null }).distinct("_id");
  },

  listPublished() {
    return Category.find({ ...LIVE, status: CATEGORY_STATUS.PUBLISHED })
      .sort({ parentId: 1, order: 1, name: 1 })
      .select("name slug description parentId attributes order")
      .lean();
  },
};
