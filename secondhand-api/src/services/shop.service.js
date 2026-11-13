import { SHOP_SEARCH, SHOP_SORT } from "../constants/shop.constants.js";
import { categoryRepository } from "../repositories/category.repository.js";
import { shopRepository } from "../repositories/shop.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { NotFoundError } from "../utils/AppError.js";
import { paginationOf, skipFor } from "../utils/pagination.js";
import { accentInsensitivePattern } from "../utils/search.js";

/*
 * Tienda pública (Home y Shop). Solo lectura y solo lo que está a la venta: nada inactivo ni eliminado, y
 * tampoco para su dueño (su vista previa sigue en `/products/slug/:slug`). Separada del CRUD de productos.
 */

// ── Orden ──
// El desempate por `_id` hace el orden estable: al paginar no se repiten ni se pierden productos.
const SORTS = {
  [SHOP_SORT.RECENT]: { createdAt: -1, _id: -1 },
  [SHOP_SORT.PRICE_ASC]: { basePrice: 1, _id: 1 },
  [SHOP_SORT.PRICE_DESC]: { basePrice: -1, _id: -1 },
  [SHOP_SORT.RELEVANCE]: { score: { $meta: "textScore" }, _id: -1 },
};

/** Sin `sort`: por relevancia si se busca con el índice de texto; si no, lo más reciente. */
function sortFor(sort, mode) {
  const wanted = sort ?? (mode === SHOP_SEARCH.MODE.TEXT ? SHOP_SORT.RELEVANCE : SHOP_SORT.RECENT);
  // La relevancia solo existe en la búsqueda con el índice de texto.
  return SORTS[wanted === SHOP_SORT.RELEVANCE && mode !== SHOP_SEARCH.MODE.TEXT ? SHOP_SORT.RECENT : wanted];
}

// ── Filtros ──
// Cada uno devuelve su trozo de filtro, `{}` si no se ha pedido o `null` si se ha pedido pero ninguno de sus
// valores existe (entonces el resultado es vacío y ni siquiera se consultan los productos).

/** Un filtro por slugs que hay que pasar a ids (categoría, vendedor). */
async function idsFilter(field, slugs, findIds) {
  if (!slugs) return {};
  const ids = await findIds(slugs);
  return ids.length ? { [field]: { $in: ids } } : null;
}

/** Una categoría incluye sus subcategorías. */
const categoryFilter = ({ category }) =>
  idsFilter("categoryId", category, async (slugs) => {
    const ids = await categoryRepository.findIdsBySlugs(slugs);
    return ids.length ? [...ids, ...(await categoryRepository.findChildrenIdsOf(ids))] : [];
  });

const sellerFilter = ({ seller }) => idsFilter("sellerId", seller, (slugs) => userRepository.findIdsBySlugs(slugs));

/** Valores que se comparan tal cual (ya validados): ubicación, estado de conservación y de venta. */
const valuesFilter = (field, values) => (values ? { [field]: { $in: values } } : {});

function priceFilter({ minPrice, maxPrice }) {
  if (minPrice === undefined && maxPrice === undefined) return {};
  return {
    basePrice: {
      ...(minPrice !== undefined && { $gte: minPrice }),
      ...(maxPrice !== undefined && { $lte: maxPrice }),
    },
  };
}

/**
 * Query dinámica de la tienda: solo con los filtros que lleguen. Los slugs se pasan a ids en paralelo.
 * `null` = algún filtro pedido no tiene ningún valor válido → resultado vacío.
 */
export async function buildShopFilter(params) {
  const fromSlugs = await Promise.all([categoryFilter(params), sellerFilter(params)]);
  if (fromSlugs.includes(null)) return null;
  return Object.assign(
    {},
    ...fromSlugs,
    valuesFilter("locationSlug", params.location),
    valuesFilter("condition", params.condition),
    valuesFilter("status", params.status),
    priceFilter(params),
  );
}

// ── Búsqueda ──
const textSearch = (term) => ({ $text: { $search: term } });
const partialSearch = (term) => ({ title: { $regex: accentInsensitivePattern(term), $options: "i" } });

/** [{ _id, count }] → { [id]: count } */
const countsById = (rows) => Object.fromEntries(rows.map((row) => [String(row._id), row.count]));

const byCountThenName = (a, b) => b.productsCount - a.productsCount || a.name.localeCompare(b.name, "es");

export const shopService = {
  /**
   * Catálogo con varios filtros a la vez (y varios valores por filtro), búsqueda, orden y paginación.
   * La búsqueda va en dos pasos: primero con el índice de texto (palabras completas, en español) y, si no
   * encuentra nada, por trozos del título sin distinguir tildes ("iph" → "iPhone"). `search.mode` dice cuál.
   */
  async listProducts(params) {
    const { page, limit, search, sort } = params;
    const filter = await buildShopFilter(params);
    const searchInfo = (mode) => (search ? { search: { term: search, mode } } : {});

    if (!filter) return { items: [], pagination: paginationOf(0, page, limit), ...searchInfo(SHOP_SEARCH.MODE.TEXT) };

    const pageOf = (query, mode) =>
      shopRepository.findProductsPage(query, { sort: sortFor(sort, mode), skip: skipFor(page, limit), limit });

    let mode = search ? SHOP_SEARCH.MODE.TEXT : null;
    let result = await pageOf(search ? { ...filter, ...textSearch(search) } : filter, mode);
    if (search && result.total === 0) {
      mode = SHOP_SEARCH.MODE.PARTIAL;
      result = await pageOf({ ...filter, ...partialSearch(search) }, mode);
    }
    return { items: result.items, pagination: paginationOf(result.total, page, limit), ...searchInfo(mode) };
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
