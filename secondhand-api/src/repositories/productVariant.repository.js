import { ProductVariant } from "../models/productVariant.model.js";
import { uniqueSlug } from "../utils/slugify.js";

const WITH_DELETED = { withDeleted: true };

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

  findById(id) {
    return ProductVariant.findById(id).populate({ path: "images", select: "url alt kind isPrimary order" });
  },

  /** Para recuperar una variante eliminada al volver a crearla con las mismas opciones. */
  restoreById(id, data) {
    return ProductVariant.findByIdAndUpdate(id, { ...data, deletedAt: null }, { new: true, runValidators: true }).setOptions(WITH_DELETED);
  },

  softDeleteByIds(ids, date) {
    return ProductVariant.softDeleteMany({ _id: { $in: ids } }, date);
  },

  findLiveByProduct(productId) {
    return ProductVariant.find({ productId }).sort({ order: 1 });
  },

  /** Incluye eliminadas: la cascada y la restauración trabajan con todas. */
  findAllByProduct(productId) {
    return ProductVariant.find({ productId }).setOptions(WITH_DELETED);
  },

  /** Incluye eliminadas: su SKU sigue ocupado en el índice único. */
  existsSku(sku) {
    return ProductVariant.exists({ sku }).setOptions(WITH_DELETED);
  },

  updateById(id, data) {
    return ProductVariant.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  },

  softDeleteByProduct(productId, date) {
    return ProductVariant.softDeleteMany({ productId }, date);
  },

  /** Solo las que se eliminaron junto al producto (misma fecha): no revive las eliminadas antes por separado. */
  restoreByProduct(productId, date) {
    return ProductVariant.restoreMany({ productId }, date, { isActive: true });
  },
};
