import { IMAGE_OWNER } from "../constants/image.constants.js";
import { categoryRepository } from "../repositories/category.repository.js";
import { imageRepository } from "../repositories/image.repository.js";
import { productRepository } from "../repositories/product.repository.js";
import { ConflictError, NotFoundError, ValidationError } from "../utils/AppError.js";
import { slugify } from "../utils/slugify.js";

const WRITABLE_FIELDS = ["name", "description", "parentId", "attributes", "order", "status"];
const pick = (data) => Object.fromEntries(Object.entries(data).filter(([key]) => WRITABLE_FIELDS.includes(key)));

async function findLiveCategory(id) {
  const category = await categoryRepository.findRawById(id);
  if (!category || category.deletedAt) throw new NotFoundError("Categoría no encontrada");
  return category;
}

/** El slug sale del nombre: si ya existe (también en la papelera), el que hay que cambiar es el nombre. */
async function assertNameAvailable(name, excludeId) {
  const existing = await categoryRepository.findRawBySlug(slugify(name));
  if (existing && String(existing._id) !== String(excludeId)) {
    throw ConflictError.forField("name", "Ya existe una categoría con ese nombre");
  }
}

/** Dos niveles como máximo: el padre existe, es una categoría principal y no es la propia categoría. */
async function assertParent(parentId, selfId) {
  if (selfId && String(parentId) === String(selfId)) {
    throw ValidationError.forField("parentId", "Una categoría no puede ser su propia categoría padre");
  }
  const parent = await categoryRepository.findRawById(parentId);
  if (!parent || parent.deletedAt) throw ValidationError.forField("parentId", "La categoría padre no existe");
  if (parent.parentId) {
    throw ValidationError.forField("parentId", "Solo se puede colgar de una categoría principal (como máximo dos niveles)");
  }
}

/** Añade a cada categoría cuántos productos y subcategorías no eliminados tiene. */
async function withCounts(categories) {
  const ids = categories.map((c) => c._id);
  const [products, children] = await Promise.all([productRepository.countByCategories(ids), categoryRepository.countChildren(ids)]);
  return categories.map((c) => ({ ...c, productsCount: products[c._id] ?? 0, childrenCount: children[c._id] ?? 0 }));
}

const statusFilter = (query) => (query.status ? { status: query.status } : {});

export const categoryService = {
  /**
   * Integridad: ¿puede un producto ir a esta categoría? Tiene que existir, estar publicada y activa.
   * Lo usa `product.service`. Si no, 422 `categoryId`.
   */
  async assertAcceptsProducts(categoryId) {
    const category = await categoryRepository.findPublishedById(categoryId);
    if (!category) throw ValidationError.forField("categoryId", "La categoría no existe, no está publicada o está inactiva");
  },

  /** Atributos de variante de una categoría: los propios o, si no tiene, los de su padre. */
  async attributesFor(categoryId) {
    const category = await categoryRepository.findAttributesById(categoryId);
    if (!category) return [];
    if (category.attributes?.length || !category.parentId) return category.attributes ?? [];
    const parent = await categoryRepository.findAttributesById(category.parentId);
    return parent?.attributes ?? [];
  },

  /** Público: categorías publicadas y activas, para los select y filtros del front. */
  async listPublished() {
    return categoryRepository.listPublished();
  },

  async listActives(query = {}) {
    return withCounts(await categoryRepository.findAll({ ...statusFilter(query), isActive: true }));
  },

  async listInactives(query = {}) {
    return withCounts(await categoryRepository.findAll({ ...statusFilter(query), isActive: false }));
  },

  async listTrashed(query = {}) {
    return withCounts(await categoryRepository.findTrashed(statusFilter(query)));
  },

  async getById(id) {
    const category = await categoryRepository.findById(id);
    if (!category) throw new NotFoundError("Categoría no encontrada");
    return (await withCounts([category]))[0];
  },

  async getBySlug(slug) {
    const category = await categoryRepository.findBySlug(slug);
    if (!category) throw new NotFoundError("Categoría no encontrada");
    return (await withCounts([category]))[0];
  },

  async create(data) {
    const input = pick(data);
    await assertNameAvailable(input.name);
    if (input.parentId) await assertParent(input.parentId);
    const category = await categoryRepository.create(input);
    return this.getById(category._id);
  },

  async update(id, data) {
    const current = await findLiveCategory(id);
    const input = pick(data);

    if (input.name !== undefined && input.name !== current.name) await assertNameAvailable(input.name, id);
    if (input.parentId) {
      await assertParent(input.parentId, id);
      const children = await categoryRepository.countChildren([id]);
      if (children[id]) {
        throw ValidationError.forField("parentId", "Tiene subcategorías: no puede pasar a ser subcategoría de otra");
      }
    }

    await categoryRepository.updateById(id, input);
    return this.getById(id);
  },

  async setActive(id, isActive) {
    const category = await categoryRepository.findRawById(id);
    if (!category) throw new NotFoundError("Categoría no encontrada");
    if (category.deletedAt) throw new ConflictError("La categoría está eliminada. Restáurala antes de cambiar su visibilidad");
    await categoryRepository.updateById(id, { isActive });
    return this.getById(id);
  },

  /** No se puede eliminar si tiene productos o subcategorías: primero hay que moverlos o eliminarlos. */
  async softDelete(id) {
    await findLiveCategory(id);
    const [products, children] = await Promise.all([productRepository.countByCategories([id]), categoryRepository.countChildren([id])]);
    const blockers = [
      products[id] && `${products[id]} ${products[id] === 1 ? "producto" : "productos"}`,
      children[id] && `${children[id]} ${children[id] === 1 ? "subcategoría" : "subcategorías"}`,
    ].filter(Boolean);
    if (blockers.length) {
      throw new ConflictError(`No se puede eliminar: tiene ${blockers.join(" y ")}. Muévelos o elimínalos antes (o desactívala).`);
    }

    const date = new Date();
    await categoryRepository.softDeleteById(id, date);
    await imageRepository.softDeleteByOwners(IMAGE_OWNER.CATEGORY, [id], date);
  },

  /** Vuelve inactiva salvo que se pida isActive true. Una subcategoría necesita que su padre no esté eliminado. */
  async restore(id, isActive = false) {
    const category = await categoryRepository.findRawById(id);
    if (!category) throw new NotFoundError("Categoría no encontrada");
    if (!category.deletedAt) throw new ConflictError("La categoría no está eliminada");
    if (category.parentId) {
      const parent = await categoryRepository.findRawById(category.parentId);
      if (!parent || parent.deletedAt) {
        throw new ConflictError("Su categoría padre está en la papelera: restáurala antes");
      }
    }

    await categoryRepository.restoreById(id, category.deletedAt, isActive);
    await imageRepository.restoreByOwners(IMAGE_OWNER.CATEGORY, [id], category.deletedAt);
    return this.getById(id);
  },
};
