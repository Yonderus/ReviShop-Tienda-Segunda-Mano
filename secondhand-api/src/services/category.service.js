import { categoryRepository } from "../repositories/category.repository.js";

export const categoryService = {
  /** Solo lectura: categorías publicadas para los select del front. */
  async listPublished() {
    return categoryRepository.listPublished();
  },
};
