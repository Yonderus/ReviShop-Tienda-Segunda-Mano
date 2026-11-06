import { categoryRepository } from "../repositories/category.repository.js";
import { shopRepository } from "../repositories/shop.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { NotFoundError } from "../utils/AppError.js";
import { paginationOf, skipFor } from "../utils/pagination.js";

/*
 * Tienda pública (Home y Shop). Solo lectura y solo lo que está a la venta: nada inactivo ni eliminado, y
 * tampoco para su dueño (su vista previa sigue en `/products/slug/:slug`). Separada del CRUD de productos.
 */

// El desempate por `_id` hace el orden estable: al paginar no se repiten ni se pierden productos.
const RECENT = { createdAt: -1, _id: -1 };

/** [{ _id, count }] → { [id]: count } */
const countsById = (rows) => Object.fromEntries(rows.map((row) => [String(row._id), row.count]));

const byCountThenName = (a, b) => b.productsCount - a.productsCount || a.name.localeCompare(b.name, "es");

export const shopService = {
  /** Una página del catálogo, de lo más reciente a lo más antiguo. */
  async listProducts({ page, limit }) {
    const { items, total } = await shopRepository.findProductsPage({}, { sort: RECENT, skip: skipFor(page, limit), limit });
    return { items, pagination: paginationOf(total, page, limit) };
  },

  /** La ficha, con todas sus fotos y solo las variantes que se pueden elegir (las activas). */
  async getProduct(slug) {
    const product = await shopRepository.findProductBySlug(slug);
    if (!product) throw new NotFoundError("Producto no encontrado");
    product.variants = product.variants.filter((variant) => variant.isActive);
    return product;
  },

  /**
   * Categorías publicadas y activas, con cuántos productos hay a la venta. Una principal cuenta también los
   * de sus subcategorías (filtrar por ella los incluye).
   */
  async listCategories() {
    const [categories, rows] = await Promise.all([categoryRepository.listPublished(), shopRepository.countOnSaleBy("categoryId")]);
    const own = countsById(rows);
    const fromChildren = {};
    for (const { _id, parentId } of categories) {
      if (parentId) fromChildren[parentId] = (fromChildren[parentId] ?? 0) + (own[_id] ?? 0);
    }
    return categories.map(({ _id, name, slug, description, parentId, order }) => ({
      _id,
      name,
      slug,
      description,
      parentId,
      order,
      productsCount: (own[_id] ?? 0) + (fromChildren[_id] ?? 0),
    }));
  },

  /** Vendedores con algo a la venta (activos y no suspendidos), con su avatar: los que más venden primero. */
  async listSellers() {
    const rows = await shopRepository.countOnSaleBy("sellerId");
    const counts = countsById(rows);
    const sellers = await userRepository.findPublicSellers(rows.map((row) => row._id));
    return sellers
      .map(({ profile, ...seller }) => ({
        ...seller,
        ...(profile?.location ? { location: profile.location } : {}),
        ...(profile?.avatar ? { avatarUrl: profile.avatar.url } : {}),
        productsCount: counts[seller._id],
      }))
      .sort(byCountThenName);
  },

  /** Ubicaciones con productos a la venta: { name, slug, productsCount }, las que más tienen primero. */
  async listLocations() {
    const rows = await shopRepository.countOnSaleBy("locationSlug", { name: "location" });
    return rows.map((row) => ({ name: row.name, slug: row._id, productsCount: row.count })).sort(byCountThenName);
  },
};
