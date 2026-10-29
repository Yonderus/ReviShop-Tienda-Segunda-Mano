import mongoose from "mongoose";
import { IMAGE_OWNER } from "../constants/image.constants.js";
import { Product } from "../models/product.model.js";

const IMAGE_FIELDS = "url alt kind isPrimary order width height";

/** Incluye los eliminados: el plugin de soft delete los oculta en todas las consultas, populate incluidos. */
const WITH_DELETED = { withDeleted: true };

// Un producto siempre muestra su categoría y su vendedor, aunque después se eliminen.
const CATEGORY_SUMMARY = { path: "category", select: "name slug", options: WITH_DELETED };
// La ubicación que cuenta es la del producto; la del vendedor está en su perfil y aquí no hace falta.
const SELLER_SUMMARY = { path: "seller", select: "name slug", options: WITH_DELETED };

/**
 * Listados: lo justo para una card o una fila de tabla.
 * El `match` de un populate sustituye al del virtual, por eso se repite `ownerType`.
 */
const LIST_POPULATE = [
  CATEGORY_SUMMARY,
  SELLER_SUMMARY,
  { path: "images", match: { ownerType: IMAGE_OWNER.PRODUCT, isPrimary: true }, select: `${IMAGE_FIELDS} ownerId` },
];

/** Papelera: también las portadas eliminadas; `findTrashed` se queda solo con las del mismo borrado. */
const TRASH_POPULATE = [
  CATEGORY_SUMMARY,
  SELLER_SUMMARY,
  {
    path: "images",
    match: { ownerType: IMAGE_OWNER.PRODUCT, isPrimary: true },
    select: `${IMAGE_FIELDS} ownerId deletedAt`,
    options: WITH_DELETED,
  },
];

/** Detalle: todas las imágenes y las variantes no eliminadas. */
const DETAIL_POPULATE = [
  { ...CATEGORY_SUMMARY, select: "name slug parentId attributes" },
  SELLER_SUMMARY,
  { path: "images", select: `${IMAGE_FIELDS} ownerId` },
  {
    path: "variants",
    select: "-__v -deletedBy",
    populate: { path: "images", select: `${IMAGE_FIELDS} ownerId` },
  },
];

/** Cuántos productos no eliminados tiene cada valor de `field`: { [id]: número }. */
async function countLiveBy(field, ids) {
  // aggregate no pasa por el plugin de soft delete: el filtro de eliminados va a mano.
  const rows = await Product.aggregate([
    { $match: { [field]: { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) }, deletedAt: null } },
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
  ]);
  return Object.fromEntries(rows.map((row) => [String(row._id), row.count]));
}

export const productRepository = {
  findAll(filter = {}) {
    return Product.find(filter).sort({ createdAt: -1 }).populate(LIST_POPULATE);
  },

  /**
   * Eliminados, del más reciente al más antiguo. Cada uno muestra solo la portada que se eliminó
   * junto a él (mismo `deletedAt`), no las que se sustituyeron antes al cambiar las fotos.
   */
  async findTrashed(filter = {}) {
    const products = await Product.find({ ...filter, deletedAt: { $ne: null } })
      .sort({ deletedAt: -1 })
      .populate(TRASH_POPULATE);
    for (const product of products) {
      product.images = product.images
        .filter((image) => +image.deletedAt === +product.deletedAt)
        .map((image) => {
          const { deletedAt: _deletedAt, ...fields } = image.toObject();
          return fields;
        });
    }
    return products;
  },

  findDetailById(id) {
    return Product.findById(id).populate(DETAIL_POPULATE);
  },

  findDetailBySlug(slug) {
    return Product.findOne({ slug }).populate(DETAIL_POPULATE);
  },

  /** Sin populate e incluyendo eliminados: el service decide qué hacer con ellos (404, 409, restaurar…). */
  findRawById(id) {
    return Product.findById(id).setOptions(WITH_DELETED).lean();
  },

  /** Incluye eliminados: su slug sigue ocupado en el índice único. */
  findRawBySlug(slug) {
    return Product.findOne({ slug }).setOptions(WITH_DELETED).lean();
  },

  create(data) {
    return Product.create(data);
  },

  updateById(id, data) {
    return Product.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  },

  /** Para campos calculados (estado, nº de variantes), que se mantienen también en la papelera. */
  updateIncludingDeleted(id, data) {
    return Product.findByIdAndUpdate(id, data, { new: true, runValidators: true }).setOptions(WITH_DELETED);
  },

  softDeleteById(id, date) {
    return Product.softDeleteMany({ _id: id }, date);
  },

  restoreById(id, date, isActive) {
    return Product.restoreMany({ _id: id }, date, { isActive });
  },

  /** Productos no eliminados (activos o no) de cada categoría: { [categoryId]: número }. */
  countByCategories(categoryIds) {
    return countLiveBy("categoryId", categoryIds);
  },

  /** Productos no eliminados (activos o no) de cada vendedor: { [sellerId]: número }. */
  countBySellers(sellerIds) {
    return countLiveBy("sellerId", sellerIds);
  },

  /** Borrado físico: solo para deshacer una creación que falló a medias. */
  hardDeleteById(id) {
    return Product.deleteOne({ _id: id });
  },
};
