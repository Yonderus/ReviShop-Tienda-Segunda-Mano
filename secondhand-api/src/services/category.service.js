import { categoryRepository } from "../repositories/category.repository.js";

export const categoryService = {
  /** Atributos de variante de una categoría: los propios o, si no tiene, los de su padre. */
  async attributesFor(categoryId) {
    const category = await categoryRepository.findAttributesById(categoryId);
    if (!category) return [];
    if (category.attributes?.length || !category.parentId) return category.attributes ?? [];
    const parent = await categoryRepository.findAttributesById(category.parentId);
    return parent?.attributes ?? [];
  },

  /** Solo lectura: categorías publicadas para los select del front. */
  async listPublished() {
    return categoryRepository.listPublished();
  },
};
