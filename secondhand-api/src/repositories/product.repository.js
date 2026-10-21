import { Product } from "../models/product.model.js";

const IMAGE_FIELDS = "url alt kind isPrimary order width height";

/** Listados: lo justo para una card o una fila de tabla. */
const LIST_POPULATE = [
  { path: "category", select: "name slug" },
  { path: "seller", select: "name slug location" },
  { path: "images", match: { isPrimary: true }, select: `${IMAGE_FIELDS} ownerId` },
];

/** Detalle: todas las imágenes y las variantes no borradas. */
const DETAIL_POPULATE = [
  { path: "category", select: "name slug parentId attributes" },
  { path: "seller", select: "name slug location" },
  { path: "images", select: `${IMAGE_FIELDS} ownerId` },
  {
    path: "variants",
    match: { deletedAt: null },
    select: "-__v -deletedBy",
    populate: { path: "images", select: `${IMAGE_FIELDS} ownerId` },
  },
];

export const productRepository = {
  findAll(filter = {}, sort = { createdAt: -1 }) {
    return Product.find(filter).sort(sort).populate(LIST_POPULATE);
  },

  findDetailById(id) {
    return Product.findById(id).populate(DETAIL_POPULATE);
  },

  findDetailBySlug(slug) {
    return Product.findOne({ slug }).populate(DETAIL_POPULATE);
  },

  /** Sin populate: para comprobaciones internas del service. */
  findRawById(id) {
    return Product.findById(id).lean();
  },

  findRawBySlug(slug) {
    return Product.findOne({ slug }).lean();
  },

  create(data) {
    return Product.create(data);
  },

  updateById(id, data) {
    return Product.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  },

  /** Borrado físico: solo para deshacer una creación que falló a medias. */
  hardDeleteById(id) {
    return Product.deleteOne({ _id: id });
  },
};
