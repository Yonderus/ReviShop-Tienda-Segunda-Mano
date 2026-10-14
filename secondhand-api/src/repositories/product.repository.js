import { Product } from "../models/product.model.js";

export const productRepository = {
  findAll(filter = {}, sort = { createdAt: -1 }) {
    return Product.find(filter).sort(sort).lean();
  },

  findById(id) {
    return Product.findById(id).lean();
  },

  findBySlug(slug) {
    return Product.findOne({ slug }).lean();
  },

  create(data) {
    return Product.create(data);
  },

  updateById(id, data) {
    return Product.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    }).lean();
  },

  deleteById(id) {
    return Product.findByIdAndDelete(id);
  },
};
