import { ProductVariant } from "../models/productVariant.model.js";
import { uniqueSlug } from "../utils/slugify.js";

export const productVariantRepository = {
  uniqueSlug(base, excludeId = null) {
    return uniqueSlug(ProductVariant, base, excludeId);
  },

  /** Borrado físico: solo para deshacer una creación de producto que falló a medias. */
  hardDeleteByProduct(productId) {
    return ProductVariant.deleteMany({ productId });
  },

  create(data) {
    return ProductVariant.create(data);
  },

  findLiveByProduct(productId) {
    return ProductVariant.find({ productId, deletedAt: null }).sort({ order: 1 });
  },

  findAllByProduct(productId) {
    return ProductVariant.find({ productId });
  },

  existsSku(sku) {
    return ProductVariant.exists({ sku });
  },

  updateById(id, data) {
    return ProductVariant.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  },

  softDeleteByProduct(productId, date) {
    return ProductVariant.updateMany({ productId, deletedAt: null }, { deletedAt: date, isActive: false });
  },

  /** Solo las que se borraron junto al producto (misma fecha): no revive las borradas antes por separado. */
  restoreByProduct(productId, date) {
    return ProductVariant.updateMany({ productId, deletedAt: date }, { deletedAt: null, isActive: true });
  },
};
