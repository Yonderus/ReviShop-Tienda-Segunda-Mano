import mongoose from "mongoose";
import { DEFAULT_OPTIONS_KEY } from "../models/productVariant.model.js";
import { categoryRepository } from "../repositories/category.repository.js";
import { imageRepository } from "../repositories/image.repository.js";
import { productRepository } from "../repositories/product.repository.js";
import { productVariantRepository } from "../repositories/productVariant.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { BadRequestError, ConflictError, NotFoundError, ValidationError } from "../utils/AppError.js";
import { buildSku, uniqueSku } from "../utils/sku.js";
import { slugify } from "../utils/slugify.js";

const WRITABLE_FIELDS = ["title", "description", "basePrice", "condition", "location", "categoryId", "sellerId"];

function validateId(id) {
  if (!mongoose.isValidObjectId(id)) throw new BadRequestError("ID de producto no válido");
}

const pick = (data, fields) => Object.fromEntries(Object.entries(data).filter(([key]) => fields.includes(key)));

async function assertCategory(categoryId) {
  const category = await categoryRepository.findPublishedById(categoryId);
  if (!category) throw new ValidationError("categoryId: la categoría no existe, no está publicada o está inactiva");
}

async function assertSeller(sellerId) {
  const seller = await userRepository.findActiveById(sellerId);
  if (!seller) throw new ValidationError("sellerId: el vendedor no existe o está inactivo");
}

async function assertSlugAvailable(slug, excludeId) {
  const existing = await productRepository.findRawBySlug(slug);
  if (existing && String(existing._id) !== String(excludeId)) {
    throw new ConflictError(`Ya existe un producto con el slug "${slug}"`);
  }
}

async function findLiveProduct(id) {
  validateId(id);
  const product = await productRepository.findRawById(id);
  if (!product || product.deletedAt) throw new NotFoundError("Producto no encontrado");
  return product;
}

const variantSlugBase = (productSlug, variant) =>
  variant.optionsKey === DEFAULT_OPTIONS_KEY
    ? `${productSlug}-default`
    : `${productSlug}-${variant.options.map((o) => o.value).join("-")}`;

/** Imágenes de entrada { url, alt } → documentos Image del producto; la primera es la portada. */
function buildProductImages(product, images = []) {
  return images.map((image, index) => ({
    ownerType: "Product",
    ownerId: product._id,
    kind: index === 0 ? "cover" : "gallery",
    url: image.url,
    alt: image.alt || `${product.title} ${index + 1}`,
    order: index,
    isPrimary: index === 0,
    status: "ready",
  }));
}

/** Filtros de listado: categoría y vendedor llegan por slug (legible en la URL). */
async function buildFilters(query) {
  const filter = {};
  if (query.category) {
    const category = await categoryRepository.findBySlug(query.category);
    if (!category) return null;
    const childIds = await categoryRepository.findChildrenIds(category._id);
    filter.categoryId = { $in: [category._id, ...childIds] };
  }
  if (query.seller) {
    const seller = await userRepository.findBySlug(query.seller);
    if (!seller) return null;
    filter.sellerId = seller._id;
  }
  if (query.condition) filter.condition = query.condition;
  if (query.status) filter.status = query.status;
  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    filter.basePrice = {};
    if (query.minPrice !== undefined) filter.basePrice.$gte = Number(query.minPrice);
    if (query.maxPrice !== undefined) filter.basePrice.$lte = Number(query.maxPrice);
  }
  return filter;
}

async function listWith(query, extra, sort) {
  const filter = await buildFilters(query);
  if (!filter) return [];
  return productRepository.findAll({ ...filter, ...extra }, sort);
}

export const productService = {
  async list(query = {}) {
    const isActive = query.isActive !== undefined ? query.isActive === "true" : true;
    return listWith(query, { deletedAt: null, isActive });
  },

  async listActives(query = {}) {
    return listWith(query, { deletedAt: null, isActive: true });
  },

  async listInactives(query = {}) {
    return listWith(query, { deletedAt: null, isActive: false });
  },

  async listTrashed(query = {}) {
    return listWith(query, { deletedAt: { $ne: null } }, { deletedAt: -1 });
  },

  async getById(id) {
    validateId(id);
    const product = await productRepository.findDetailById(id);
    if (!product || product.deletedAt) throw new NotFoundError("Producto no encontrado");
    return product;
  },

  async getBySlug(slug) {
    const product = await productRepository.findDetailBySlug(slug);
    if (!product || product.deletedAt) throw new NotFoundError("Producto no encontrado");
    return product;
  },

  async create(data) {
    const input = pick(data, WRITABLE_FIELDS);
    await assertCategory(input.categoryId);
    await assertSeller(input.sellerId);
    input.slug = slugify(input.title);
    await assertSlugAvailable(input.slug);

    const product = await productRepository.create(input);
    try {
      await productVariantRepository.create({
        productId: product._id,
        sku: await uniqueSku(buildSku(product.slug), (sku) => productVariantRepository.existsSku(sku)),
        slug: await productVariantRepository.uniqueSlug(`${product.slug}-default`),
        options: [],
        optionsKey: DEFAULT_OPTIONS_KEY,
        isDefault: true,
      });
      if (data.images?.length) await imageRepository.createMany(buildProductImages(product, data.images));
    } catch (error) {
      // Sin variante el producto quedaría huérfano: se deshace la creación completa.
      await productVariantRepository.hardDeleteByProduct(product._id);
      await productRepository.hardDeleteById(product._id);
      throw error;
    }
    return productRepository.findDetailById(product._id);
  },

  async update(id, data) {
    const current = await findLiveProduct(id);
    const input = pick(data, WRITABLE_FIELDS);
    if (input.categoryId) await assertCategory(input.categoryId);
    if (input.sellerId) await assertSeller(input.sellerId);

    const titleChanged = input.title !== undefined && input.title !== current.title;
    if (titleChanged) {
      input.slug = slugify(input.title);
      await assertSlugAvailable(input.slug, id);
    }

    const product = await productRepository.updateById(id, input);

    if (titleChanged) {
      const variants = await productVariantRepository.findAllByProduct(id);
      for (const variant of variants) {
        const slug = await productVariantRepository.uniqueSlug(variantSlugBase(product.slug, variant), variant._id);
        await productVariantRepository.updateById(variant._id, { slug });
      }
    }

    if (data.images) {
      // Las imágenes se sustituyen como conjunto: las anteriores pasan a soft delete.
      await imageRepository.softDeleteByOwners("Product", [product._id], new Date());
      if (data.images.length) await imageRepository.createMany(buildProductImages(product, data.images));
    }

    return productRepository.findDetailById(id);
  },

  /** disponible si queda alguna disponible; reservado si no y hay alguna reservada; si no, vendido. */
  async recalculateStatus(productId) {
    const variants = await productVariantRepository.findLiveByProduct(productId);
    const statuses = variants.map((v) => v.status);
    let status = "vendido";
    if (statuses.includes("disponible") || statuses.length === 0) status = "disponible";
    else if (statuses.includes("reservado")) status = "reservado";
    await productRepository.updateById(productId, { status, variantsCount: variants.length });
    return status;
  },

  async changeStatus(id, status) {
    await findLiveProduct(id);
    const variants = await productVariantRepository.findLiveByProduct(id);
    if (variants.length > 1) {
      throw new ValidationError("El producto tiene varias variantes: el estado se cambia por variante");
    }
    if (variants.length === 1) await productVariantRepository.updateById(variants[0]._id, { status });
    else await productRepository.updateById(id, { status });
    await this.recalculateStatus(id);
    return productRepository.findDetailById(id);
  },

  async setActive(id, isActive) {
    validateId(id);
    const product = await productRepository.findRawById(id);
    if (!product) throw new NotFoundError("Producto no encontrado");
    if (product.deletedAt) {
      throw new ConflictError("El producto está eliminado. Restáuralo antes de cambiar su visibilidad");
    }
    await productRepository.updateById(id, { isActive });
    return productRepository.findDetailById(id);
  },

  /** Soft delete en cascada: producto, variantes e imágenes con la misma fecha. */
  async softDelete(id) {
    const product = await findLiveProduct(id);
    const date = new Date();
    await productRepository.updateById(id, { deletedAt: date, isActive: false });
    await cascadeSoftDelete(product._id, date);
  },

  /** Restaura el producto y solo los hijos que se borraron con él (misma fecha). */
  async restore(id, isActive = false) {
    validateId(id);
    const product = await productRepository.findRawById(id);
    if (!product) throw new NotFoundError("Producto no encontrado");
    if (!product.deletedAt) throw new ConflictError("El producto no está eliminado");

    const date = product.deletedAt;
    await productRepository.updateById(id, { deletedAt: null, isActive });
    const variantIds = (await productVariantRepository.findAllByProduct(id)).map((v) => v._id);
    await productVariantRepository.restoreByProduct(id, date);
    await imageRepository.restoreByOwners("Product", [product._id], date);
    await imageRepository.restoreByOwners("ProductVariant", variantIds, date);
    return productRepository.findDetailById(id);
  },
};

export async function cascadeSoftDelete(productId, date) {
  const variantIds = (await productVariantRepository.findAllByProduct(productId)).map((v) => v._id);
  await productVariantRepository.softDeleteByProduct(productId, date);
  await imageRepository.softDeleteByOwners("Product", [productId], date);
  await imageRepository.softDeleteByOwners("ProductVariant", variantIds, date);
}
