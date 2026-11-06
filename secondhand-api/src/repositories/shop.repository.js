import { Product } from "../models/product.model.js";
import { DETAIL_POPULATE, LIST_POPULATE } from "./product.repository.js";

/*
 * Tienda pública: solo lectura y solo lo que se puede enseñar. Todo lo de aquí lleva `isActive: true`; los
 * eliminados los quita el plugin de soft delete en `find`, y a mano en `aggregate` (que no pasa por él).
 */

const ON_SALE = { isActive: true };
const ON_SALE_AGGREGATE = { ...ON_SALE, deletedAt: null };

export const shopRepository = {
  /** Una página de productos y el total con ese filtro, en paralelo. */
  async findProductsPage(filter, { sort, skip, limit }) {
    const query = { ...filter, ...ON_SALE };
    const [items, total] = await Promise.all([
      Product.find(query).sort(sort).skip(skip).limit(limit).populate(LIST_POPULATE),
      Product.countDocuments(query),
    ]);
    return { items, total };
  },

  /** La ficha: solo si está a la venta (activo y no eliminado). */
  findProductBySlug(slug) {
    return Product.findOne({ slug, ...ON_SALE }).populate(DETAIL_POPULATE);
  },

  /**
   * Productos a la venta por cada valor de `field` (`categoryId`, `sellerId`…): [{ _id, count }]. Con `name`,
   * además el primer valor de ese otro campo (p. ej. cómo se escribe la ubicación).
   */
  countOnSaleBy(field, { name } = {}) {
    return Product.aggregate([
      { $match: { ...ON_SALE_AGGREGATE, [field]: { $ne: null } } },
      { $group: { _id: `$${field}`, count: { $sum: 1 }, ...(name ? { name: { $first: `$${name}` } } : {}) } },
    ]);
  },
};
