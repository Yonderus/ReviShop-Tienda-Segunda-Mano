import mongoose from "mongoose";
import { productRepository } from "../repositories/product.repository.js";
import { BadRequestError, ConflictError, NotFoundError } from "../utils/AppError.js";
import { slugify } from "../utils/slugify.js";

function validateId(id) {
  if (!mongoose.isValidObjectId(id)) {
    throw new BadRequestError("ID de producto no valido");
  }
}

function sanitizeInput(data) {
  const allowed = [
    "title",
    "description",
    "price",
    "category",
    "condition",
    "location",
    "images",
    "seller",
    "status",
  ];
  return Object.fromEntries(
    Object.entries(data).filter(([key]) => allowed.includes(key))
  );
}

async function ensureSlugAvailable(slug, excludeId) {
  const existing = await productRepository.findBySlug(slug);
  if (existing && String(existing._id) !== String(excludeId)) {
    throw new ConflictError(`Ya existe un producto con el slug "${slug}"`);
  }
}

function buildFilters(query) {
  const filter = {};
  if (query.category) filter.category = query.category;
  if (query.condition) filter.condition = query.condition;
  if (query.status) filter.status = query.status;
  if (query.seller) filter.seller = query.seller;
  if (query.minPrice || query.maxPrice) {
    filter.price = {};
    if (query.minPrice) filter.price.$gte = Number(query.minPrice);
    if (query.maxPrice) filter.price.$lte = Number(query.maxPrice);
  }
  return filter;
}

export const productService = {
  async list(query = {}) {
    const filter = { ...buildFilters(query), deletedAt: null };
    filter.isActive = query.isActive !== undefined ? query.isActive === "true" : true;
    return productRepository.findAll(filter);
  },

  async listTrashed(query = {}) {
    const filter = { ...buildFilters(query), deletedAt: { $ne: null } };
    return productRepository.findAll(filter, { deletedAt: -1 });
  },

  async listActives(query = {}) {
    return this.list({ ...query, isActive: "true" });
  },

  async listInactives(query = {}) {
    return this.list({ ...query, isActive: "false" });
  },

  async getById(id) {
    validateId(id);
    const product = await productRepository.findById(id);
    if (!product || product.deletedAt) {
      throw new NotFoundError("Producto no encontrado");
    }
    return product;
  },

  async getBySlug(slug) {
    const product = await productRepository.findBySlug(slug);
    if (!product || product.deletedAt) {
      throw new NotFoundError("Producto no encontrado");
    }
    return product;
  },

  async create(data) {
    const input = sanitizeInput(data);
    input.slug = slugify(input.title);
    await ensureSlugAvailable(input.slug);
    return productRepository.create(input);
  },

  async update(id, data) {
    validateId(id);
    const input = sanitizeInput(data);
    if (input.title) {
      input.slug = slugify(input.title);
      await ensureSlugAvailable(input.slug, id);
    }
    const product = await productRepository.updateById(id, input);
    if (!product) throw new NotFoundError("Producto no encontrado");
    return product;
  },

  async setActive(id, isActive) {
    validateId(id);
    const product = await productRepository.findById(id);
    if (!product) throw new NotFoundError("Producto no encontrado");
    if (product.deletedAt) {
      throw new ConflictError("El producto esta eliminado. Restauralo antes de cambiar su estado");
    }
    return productRepository.updateById(id, { isActive });
  },

  async restore(id, isActive = false) {
    validateId(id);
    const product = await productRepository.findById(id);
    if (!product) throw new NotFoundError("Producto no encontrado");
    if (!product.deletedAt) {
      throw new ConflictError("El producto no esta eliminado");
    }
    return productRepository.updateById(id, { deletedAt: null, isActive });
  },

  async softDelete(id) {
    validateId(id);
    const product = await productRepository.findById(id);
    if (!product || product.deletedAt) {
      throw new NotFoundError("Producto no encontrado");
    }
    return productRepository.updateById(id, { deletedAt: new Date(), isActive: false });
  },
};
